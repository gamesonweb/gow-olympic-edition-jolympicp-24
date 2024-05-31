import { ActionManager, Color3, Color4, FollowCamera, FreeCamera, HavokPlugin, HemisphericLight, InterpolateValueAction, KeyboardEventTypes, Mesh, MeshBuilder, ParticleSystem, PhysicsAggregate, PhysicsHelper, PhysicsMotionType, PhysicsRadialImpulseFalloff, PhysicsShapeType, Scene, SetValueAction, ShadowGenerator, SpotLight, StandardMaterial, Texture, Vector3 } from "@babylonjs/core";
import { Inspector } from '@babylonjs/inspector';
import HavokPhysics from "@babylonjs/havok";

import floorUrl from "../assets/textures/floor.png";
import floorBumpUrl from "../assets/textures/floor_bump.png";
import Player from "./player";
import Arena from "./arena";

class Game {

    #canvas;
    #engine;
    #havokInstance;
    #gameScene;
    #gameCamera;
    #shadowGenerator;
    #shadowGenerator2;
    #bInspector = false;

    #elevator;
    #elevatorAggregate;


    #phase = 0.0;
    #vitesseY = 1.8;

    inputMap = {};
    actions = {};

    #arena;
    #player;

    constructor(canvas, engine) {
        this.#canvas = canvas;
        this.#engine = engine;
    }

    async start() {
        await this.initGame()
        this.gameLoop();
        this.endGame();
    }

    createScene() {
        const scene = new Scene(this.#engine);
        scene.collisionsEnabled = true;

        const hk = new HavokPlugin(true, this.#havokInstance);
        // enable physics in the scene with a gravity
        scene.enablePhysics(new Vector3(0, -9.81, 0), hk);

        this.#gameCamera = new FollowCamera("camera1", new Vector3(0, 0, 0), scene);
        this.#gameCamera.heightOffset = 8;
        this.#gameCamera.radius = -12;
        this.#gameCamera.maxCameraSpeed = 1;
        this.#gameCamera.cameraAcceleration = 0.025;
        this.#gameCamera.rotationOffset = 0;
        //this.#gameCamera.setTarget(Vector3.Zero());
        //this.#gameCamera.attachControl(this.#canvas, true);

        const light = new HemisphericLight("light", new Vector3(0, 1, 0), scene);
        light.intensity = 0.4;
        light.diffuse = new Color3(.5, .5, .7);
        light.specular = new Color3(1, 1, 1);
        light.groundColor = new Color3(.7, .7, .9);

        const sLight = new SpotLight("spot1", new Vector3(0, 20, 30), new Vector3(0, -1, -0.5), 2 * Math.PI / 3, 15, scene);
        sLight.shadowMinZ = 1;
        sLight.shadowMaxZ = 200;
        sLight.diffuse = new Color3(222, 222, 240);
        sLight.intensity = 7;

        this.#shadowGenerator = new ShadowGenerator(1024, sLight);
        this.#shadowGenerator.useBlurExponentialShadowMap = true;
        this.#shadowGenerator.frustumEdgeFalloff = 1.0;
        this.#shadowGenerator.setDarkness(0.1);

        const sLight2 = new SpotLight("spot2", new Vector3(0, 20, -30), new Vector3(0, -1, 0.5), 2 * Math.PI / 3, 15, scene);
        sLight2.shadowMinZ = 1;
        sLight2.shadowMaxZ = 200;
        sLight2.diffuse = new Color3(222, 222, 240);
        sLight2.intensity = 7;

        this.#shadowGenerator2 = new ShadowGenerator(1024, sLight2);
        this.#shadowGenerator2.useBlurExponentialShadowMap = true;
        this.#shadowGenerator2.frustumEdgeFalloff = 1.0;
        this.#shadowGenerator2.setDarkness(0.1);


        const elevator = MeshBuilder.CreateDisc("sphere", { diameter: 2, segments: 32 }, scene);
        elevator.rotate(Vector3.Right(), Math.PI / 2)
        elevator.position.y = 0.1;
        this.#elevator = elevator;

        const ground = MeshBuilder.CreateGround("ground", { width: 640, height: 640, subdivisions: 128 }, scene);
        ground.position = new Vector3(0, -0.1, 0);

        const matGround = new StandardMaterial("boue", scene);
        //matGround.diffuseColor = new Color3(1, 0.4, 0);
        matGround.diffuseTexture = new Texture(floorUrl);
        matGround.diffuseTexture.uScale = 64;
        matGround.diffuseTexture.vScale = 64;
        matGround.bumpTexture = new Texture(floorBumpUrl);
        matGround.bumpTexture.uScale = 64;
        matGround.bumpTexture.vScale = 64;

        ground.material = matGround;
        ground.receiveShadows = true;
        // Create a static box shape.
        const groundAggregate = new PhysicsAggregate(ground, PhysicsShapeType.BOX, { mass: 0, friction: 0.7, restitution: 0.2 }, scene);
        groundAggregate.body.setMotionType(PhysicsMotionType.STATIC);

        const matSphere = new StandardMaterial("silver", scene);
        matSphere.diffuseColor = new Color3(0.8, 0.8, 1);
        matSphere.specularColor = new Color3(0.4, 0.4, 1);
        elevator.material = matSphere;

        this.#shadowGenerator.addShadowCaster(elevator);
        this.#shadowGenerator2.addShadowCaster(elevator);


        // Create a sphere shape and the associated body. Size will be determined automatically.
        this.#elevatorAggregate = new PhysicsAggregate(elevator, PhysicsShapeType.CONVEX_HULL, { mass: 1, restitution: 0.0 }, scene);
        this.#elevatorAggregate.body.setMotionType(PhysicsMotionType.ANIMATED);


        let boxDebug = MeshBuilder.CreateBox("boxDebug", { width: 0.5, depth: 0.5, height: 0.25 });
        boxDebug.position = new Vector3(10, 1, 5);
        this.#shadowGenerator.addShadowCaster(boxDebug);
        this.#shadowGenerator2.addShadowCaster(boxDebug);

        // Create a sphere shape and the associated body. Size will be determined automatically.
        const boxAggregate = new PhysicsAggregate(boxDebug, PhysicsShapeType.BOX, { mass: .25, friction: 0.05, restitution: 0.3 }, scene);

        

        return scene;
    }

    async getInitializedHavok() {
        return await HavokPhysics();
    }

    async initGame() {
        this.#havokInstance = await this.getInitializedHavok();
        this.#gameScene = this.createScene();
        this.#player = new Player(-10.70, 0.92, 25.88, this.#gameScene);
        await this.#player.init();
        this.#gameCamera.lockedTarget = this.#player.transform;
        this.#shadowGenerator.addShadowCaster(this.#player.gameObject, true);
        this.#shadowGenerator2.addShadowCaster(this.#player.gameObject, true);

        // Faire en sorte que le joueur regarde vers la gauche de la direction de la caméra
        const leftOfCamera = this.#gameCamera.position.subtract(new Vector3(1, 0, 0));
        this.#player.gameObject.lookAt(leftOfCamera);

        this.#arena = new Arena(0, 0, 0, this.#gameScene);
        await this.#arena.init();
        this.#shadowGenerator.addShadowCaster(this.#arena.gameObject, true);
        this.#shadowGenerator2.addShadowCaster(this.#arena.gameObject, true);

        this.initInput();
    }

    initInput() {
        this.#gameScene.onKeyboardObservable.add((kbInfo) => {
            switch (kbInfo.type) {
                case KeyboardEventTypes.KEYDOWN:
                    this.inputMap[kbInfo.event.code] = true;
                    console.log(`KEY DOWN: ${kbInfo.event.code} / ${kbInfo.event.key}`);
                    break;
                case KeyboardEventTypes.KEYUP:
                    this.inputMap[kbInfo.event.code] = false;
                    this.actions[kbInfo.event.code] = true;
                    console.log(`KEY UP: ${kbInfo.event.code} / ${kbInfo.event.key}`);
                    break;
            }
        });
    }

    endGame() {

    }

    gameLoop() {

        const divFps = document.getElementById("fps");
        this.#engine.runRenderLoop(() => {

            this.updateGame();


            //Debug
            if (this.actions["KeyI"]) {
                this.#bInspector = !this.#bInspector;

                if (this.#bInspector)
                    Inspector.Show();
                else
                    Inspector.Hide();
            }

            this.actions = {};
            divFps.innerHTML = this.#engine.getFps().toFixed() + " fps";
            this.#gameScene.render();
        });
    }

    updateGame() {

        let delta = this.#engine.getDeltaTime() / 1000.0;

        // Vérifiez si les touches flèche sont enfoncées et ajustez la position et l'angle de la caméra en conséquence
        if (this.inputMap["ArrowUp"]) {
            this.#gameCamera.radius += 1; // Ajustez cette valeur pour changer la vitesse de déplacement de la caméra
        }
        if (this.inputMap["ArrowDown"]) {
            this.#gameCamera.radius -= 1; // Ajustez cette valeur pour changer la vitesse de déplacement de la caméra
        }
        if (this.inputMap["ArrowLeft"]) {
            this.#gameCamera.rotationOffset += 0.01; // Ajustez cette valeur pour changer la vitesse de rotation de la caméra
        }
        if (this.inputMap["ArrowRight"]) {
            this.#gameCamera.rotationOffset -= 0.01; // Ajustez cette valeur pour changer la vitesse de rotation de la caméra
        }

        this.#player.update(this.inputMap, this.actions, delta);

        //Animation
        this.#phase += this.#vitesseY * delta;
        this.#elevatorAggregate.body.setLinearVelocity(new Vector3(0, Math.sin(this.#phase)), 0);
    }
}

export default Game;