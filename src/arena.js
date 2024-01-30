import { Color3, MeshBuilder, PhysicsAggregate, PhysicsMotionType, PhysicsShape, PhysicsShapeType, SceneLoader, StandardMaterial, TransformNode, Vector3 } from "@babylonjs/core";

import arenaModelUrl from "../assets/models/ice_hockey.glb";

class Arena {

    scene;
    x;
    y;
    z;

    gameObject;
    meshAggregate;

    zoneA;
    zoneB;


    constructor(x, y, z, scene) {
        this.x = x || 0;
        this.y = y || 0;
        this.z = z || 0;
        this.scene = scene || undefined;

        this.gameObject = new TransformNode("arena", scene);
        this.gameObject.position = new Vector3(x, y, z);
    }

    async init() {


        const result = await SceneLoader.ImportMeshAsync("", "", arenaModelUrl, this.scene);
        
        this.gameObject = result.meshes[0];
        this.gameObject.name = "arena";
        this.gameObject.setParent(null);
        this.gameObject.scaling.scaleInPlace(2.5);
        this.gameObject.position.set(this.x, this.y, this.z);


        for (let childMesh of result.meshes) {

            childMesh.refreshBoundingInfo(true);
            if (childMesh.getTotalVertices() > 0) {
                const meshAggregate = new PhysicsAggregate(childMesh, PhysicsShapeType.MESH, {mass:0, friction: 0.4, restitution : 0.1});
                meshAggregate.body.setMotionType(PhysicsMotionType.STATIC);
                childMesh.receiveShadows = true;
           }
        }


        this.zoneA = MeshBuilder.CreateBox("zoneA", { width: 4.2, height: 0.2, depth: 2.0 }, this.scene);
        let zoneMat = new StandardMaterial("zoneA", this.scene);
        zoneMat.diffuseColor = Color3.Red();
        //zoneMat.alpha = 0.5;
        this.zoneA.material = zoneMat;
        this.zoneA.position = new Vector3(0, 0.1, 27.5);


        this.zoneB = MeshBuilder.CreateBox("zoneB",  { width: 4.2, height: 0.2, depth: 2.0 }, this.scene);
        let zoneMatB = new StandardMaterial("zoneB", this.scene);
        zoneMatB.diffuseColor = Color3.Green();
        //zoneMatB.alpha = 0.5;
        this.zoneB.material = zoneMatB;
        this.zoneB.position = new Vector3(0, 0.1, -27.5);
        
    }

    update(delta) {

    }
}

export default Arena;