import { Matrix, Mesh, MeshBuilder, Physics6DoFConstraint, PhysicsAggregate, PhysicsConstraintAxis, PhysicsMotionType, PhysicsShapeType, Quaternion, SceneLoader, TransformNode, Vector3 } from "@babylonjs/core";

import girlModelUrl from "../assets/models/personnage.glb";

const USE_FORCES = true;
let RUNNING_SPEED = 2;
let JUMP_IMPULSE = 10;
const PLAYER_HEIGHT = 1.85;
const PLAYER_RADIUS = 0.4;


class Player {

    scene;
    //Position dans le monde
    transform;
    //Mesh
    gameObject;
    //Physic
    capsuleAggregate;

    //Animations
    animationsGroup;

    bWalking = false;
    bOnGround = false;
    bFalling = false;
    bJumping = false;

    idleAnim;
    runAnim;
    walkAnim;

    x = 0.0;
    y = 0.0;
    z = 0.0;

    speedX = 0.0;
    speedY = 0.0;
    speedZ = 0.0;

    constructor(x, y, z, scene) {

        this.scene = scene;
        this.x = x || 0.0;
        this.y = y || 0.0;
        this.z = z || 0.0;
        this.transform = new MeshBuilder.CreateCapsule("player", { height: PLAYER_HEIGHT, radius: PLAYER_RADIUS }, this.scene);
        this.transform.visibility = 0.0;
        this.transform.position = new Vector3(this.x, this.y, this.z);
        if (USE_FORCES) {
            RUNNING_SPEED *= 2;
        }
    }

    async init() {
        //On cré le mesh et on l'attache à notre parent
        const result = await SceneLoader.ImportMeshAsync("", "", girlModelUrl, this.scene);
        this.gameObject = result.meshes[0];
        this.gameObject.scaling = new Vector3(1, 1, 1);
        this.gameObject.position = new Vector3(0, -PLAYER_HEIGHT / 2, 0);
        this.gameObject.rotate(Vector3.UpReadOnly, Math.PI);
        this.gameObject.bakeCurrentTransformIntoVertices();
        this.gameObject.checkCollisions = true;

        this.capsuleAggregate = new PhysicsAggregate(this.transform, PhysicsShapeType.CAPSULE, { mass: 1, friction: 1, restitution: 0.1 }, this.scene);
        this.capsuleAggregate.body.setMotionType(PhysicsMotionType.DYNAMIC);

        //On bloque les rotations avec cette méthode, à vérifier.
        this.capsuleAggregate.body.setMassProperties({
            inertia: new Vector3(0, 0, 0),
            centerOfMass: new Vector3(0, PLAYER_HEIGHT / 2, 0),
            mass: 1,
            inertiaOrientation: new Quaternion(0, 0, 0, 1)
        });
        if (USE_FORCES) {
            this.capsuleAggregate.body.setLinearDamping(0.8);
            this.capsuleAggregate.body.setAngularDamping(10.0);
        }
        else {
            this.capsuleAggregate.body.setLinearDamping(0.5);
            this.capsuleAggregate.body.setAngularDamping(0.5);
        }

        this.gameObject.parent = this.transform;
        this.animationsGroup = result.animationGroups;
        this.animationsGroup[0].stop();
        this.idleAnim = this.scene.getAnimationGroupByName('idle');
        this.runAnim = this.scene.getAnimationGroupByName('running');
        this.walkAnim = this.scene.getAnimationGroupByName('walking');
        this.idleAnim.start(true, 1.0, this.idleAnim.from, this.idleAnim.to, false);
    }

    //Pour le moment on passe les events clavier ici, on utilisera un InputManager plus tard
    update(inputMap, actions, delta) {
        let currentVelocity = this.capsuleAggregate.body.getLinearVelocity();

        //Inputs
        if (inputMap["KeyA"])
            this.speedX = -RUNNING_SPEED;
        else if (inputMap["KeyD"])
            this.speedX = RUNNING_SPEED;
        else {
            //Frottements
            if (USE_FORCES)
                this.speedX = 0;
            else
                this.speedX += (-2 * this.speedX * delta);
        }

        if (inputMap["KeyW"])
            this.speedZ = RUNNING_SPEED;
        else if (inputMap["KeyS"])
            this.speedZ = -RUNNING_SPEED;
        else {
            //Frottements
            if (USE_FORCES)
                this.speedZ = 0;
            else
                this.speedZ += (-2 * this.speedZ * delta);
        }

        if (USE_FORCES) {

            if (actions["Space"] && currentVelocity.y == 0) {
                //Avec la physique il va falloir tester notre distance par rapport au sol (raycast) et si on chute ou pas
                // pour l'instant on autorise le saut
                this.capsuleAggregate.body.applyImpulse(new Vector3(0, JUMP_IMPULSE, 0), Vector3.Zero());
            }

            //Position update
            this.capsuleAggregate.body.applyForce(new Vector3(this.speedX, 0, this.speedZ), Vector3.Zero());

        }
        else {
            let impulseY = 0;
            if (actions["Space"] && currentVelocity.y == 0) {
                impulseY = JUMP_IMPULSE;
            }

            //Gravity  + saut
            currentVelocity = new Vector3(this.speedX, impulseY + currentVelocity.y, this.speedZ);

            //Position update
            this.capsuleAggregate.body.setLinearVelocity(currentVelocity);
        }
        

        //Orientation
        let directionXZ = new Vector3(this.speedX, 0, this.speedZ);


        //Animations
        if (directionXZ.length() > 2.5) {

            this.gameObject.lookAt(directionXZ.normalize());

            if (!this.bWalking) {
                this.runAnim.start(true, 1.0, this.runAnim.from, this.runAnim.to, false);
                this.bWalking = true;
            }
        }
        else {
            if (this.bWalking) {
                this.runAnim.stop();
                this.idleAnim.start(true, 1.0, this.idleAnim.from, this.idleAnim.to, false);
                this.bWalking = false;
            }
        }
    }

}

export default Player;