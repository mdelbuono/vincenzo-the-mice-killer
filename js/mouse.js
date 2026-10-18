import * as THREE from 'three';
import { createCatchPromptTexture } from './textures.js';

// --- The Mice (Roam in Room, Level Difficulty Speed Scaling) ---
// Golden mice are rare: faster, more alert, and worth more brokjes.
const GOLDEN_SPEED_MULT = 1.5;

export class Mouse {
    constructor(scene, room, speedMultiplier = 1.0, golden = false) {
        this.scene = scene;
        this.room = room;
        this.golden = golden;
        this.mesh = new THREE.Group();

        this.position = new THREE.Vector3();
        this.spawnInRoom();

        this.rotationY = Math.random() * Math.PI * 2;
        this.state = 'ROAMING';
        const goldenMult = golden ? GOLDEN_SPEED_MULT : 1.0;
        this.speed = 4.2 * speedMultiplier * goldenMult;
        this.fleeSpeed = 7.5 * speedMultiplier * goldenMult;
        this.alertDistance = golden ? 9.0 : 6.5; // Golden mice notice the cat sooner
        this.walkCycle = 0;

        this.wanderTarget = new THREE.Vector3();
        this.pauseTimer = 0;
        this.pickNewWanderTarget();

        this.buildModel();
        this.scene.add(this.mesh);
    }

    spawnInRoom() {
        const boundX = this.room.roomWidth / 2 - 3.0;
        const boundZ = this.room.roomDepth / 2 - 3.0;
        for (let attempt = 0; attempt < 25; attempt++) {
            const rx = (Math.random() - 0.5) * boundX * 2;
            const rz = (Math.random() - 0.5) * boundZ * 2;
            if (!this.room.checkCollision(rx, rz, 0.5)) {
                this.position.set(rx, 0, rz);
                return;
            }
        }
        this.position.set(0, 0, 0);
    }

    pickNewWanderTarget() {
        const boundX = this.room.roomWidth / 2 - 3.5;
        const boundZ = this.room.roomDepth / 2 - 3.5;
        for (let attempt = 0; attempt < 15; attempt++) {
            const tx = (Math.random() - 0.5) * boundX * 2;
            const tz = (Math.random() - 0.5) * boundZ * 2;
            if (!this.room.checkCollision(tx, tz, 0.6)) {
                this.wanderTarget.set(tx, 0, tz);
                return;
            }
        }
        this.wanderTarget.set(0, 0, 0);
    }

    buildModel() {
        const mouseMat = this.golden
            ? new THREE.MeshStandardMaterial({ color: 0xffd32a, metalness: 0.5, roughness: 0.25, emissive: 0xb8860b, emissiveIntensity: 0.5 })
            : new THREE.MeshStandardMaterial({ color: 0x7f8c8d, roughness: 0.6 });
        const pinkMat = new THREE.MeshStandardMaterial({ color: 0xffa8a8, roughness: 0.7 });
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });

        const bodyGeo = new THREE.SphereGeometry(0.24, 12, 10);
        bodyGeo.scale(0.8, 0.7, 1.4);
        const body = new THREE.Mesh(bodyGeo, mouseMat);
        body.position.y = 0.16;
        body.castShadow = true;
        this.mesh.add(body);

        const snoutGeo = new THREE.ConeGeometry(0.1, 0.24, 8);
        const snout = new THREE.Mesh(snoutGeo, mouseMat);
        snout.rotation.x = -Math.PI / 2;
        snout.position.set(0, 0.14, -0.32);
        this.mesh.add(snout);

        const nose = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), pinkMat);
        nose.position.set(0, 0.14, -0.45);
        this.mesh.add(nose);

        const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), eyeMat);
        eyeL.position.set(-0.08, 0.2, -0.25);
        this.mesh.add(eyeL);

        const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), eyeMat);
        eyeR.position.set(0.08, 0.2, -0.25);
        this.mesh.add(eyeR);

        const earGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.02, 12);
        const earL = new THREE.Mesh(earGeo, pinkMat);
        earL.position.set(-0.16, 0.3, -0.12);
        earL.rotation.z = -0.4;
        this.mesh.add(earL);

        const earR = new THREE.Mesh(earGeo, pinkMat);
        earR.position.set(0.16, 0.3, -0.12);
        earR.rotation.z = 0.4;
        this.mesh.add(earR);

        this.tail = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.015, 0.6, 6), pinkMat);
        this.tail.rotation.x = -Math.PI / 3;
        this.tail.position.set(0, 0.16, 0.4);
        this.mesh.add(this.tail);

        // Golden mice wear a spinning sparkle halo
        if (this.golden) {
            this.halo = new THREE.Group();
            const ring = new THREE.Mesh(
                new THREE.TorusGeometry(0.42, 0.03, 6, 24),
                new THREE.MeshBasicMaterial({ color: 0xffd32a, transparent: true, opacity: 0.8 })
            );
            ring.rotation.x = Math.PI / 2;
            this.halo.add(ring);
            const sparkleMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
            for (let i = 0; i < 4; i++) {
                const a = (i / 4) * Math.PI * 2;
                const sparkle = new THREE.Mesh(new THREE.OctahedronGeometry(0.07), sparkleMat);
                sparkle.position.set(Math.cos(a) * 0.42, 0, Math.sin(a) * 0.42);
                this.halo.add(sparkle);
            }
            this.halo.position.y = 0.45;
            this.mesh.add(this.halo);
        }

        const exclamGroup = new THREE.Group();
        const exclamBar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.32, 0.08), new THREE.MeshBasicMaterial({ color: 0xff3838 }));
        exclamBar.position.y = 0.18;
        exclamGroup.add(exclamBar);
        const exclamDot = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), new THREE.MeshBasicMaterial({ color: 0xff3838 }));
        exclamDot.position.y = -0.06;
        exclamGroup.add(exclamDot);
        exclamGroup.position.set(0, 0.7, 0);
        exclamGroup.visible = false;
        this.mesh.add(exclamGroup);
        this.exclamationMesh = exclamGroup;

        const catchSpriteMat = new THREE.SpriteMaterial({
            map: createCatchPromptTexture(),
            transparent: true,
            depthTest: false
        });
        this.catchPromptSprite = new THREE.Sprite(catchSpriteMat);
        this.catchPromptSprite.scale.set(1.4, 0.42, 1);
        this.catchPromptSprite.position.set(0, 0.95, 0);
        this.catchPromptSprite.visible = false;
        this.mesh.add(this.catchPromptSprite);
    }

    update(dt, catPos) {
        if (this.state === 'CAUGHT') return;

        const distToCat = this.position.distanceTo(catPos);
        const isCatNear = distToCat < this.alertDistance;

        const inCatchRange = distToCat <= 3.2;
        if (this.catchPromptSprite) {
            this.catchPromptSprite.visible = inCatchRange;
            if (inCatchRange) {
                this.catchPromptSprite.position.y = 0.95 + Math.sin(Date.now() * 0.009) * 0.08;
            }
        }

        if (isCatNear) {
            this.state = 'FLEEING';
            if (this.exclamationMesh) this.exclamationMesh.visible = true;

            let fleeDirX = this.position.x - catPos.x;
            let fleeDirZ = this.position.z - catPos.z;
            const len = Math.hypot(fleeDirX, fleeDirZ) || 1;
            fleeDirX /= len;
            fleeDirZ /= len;

            const boundX = this.room.roomWidth / 2 - 2.0;
            const boundZ = this.room.roomDepth / 2 - 2.0;
            if (this.position.x > boundX && fleeDirX > 0) fleeDirX = -0.6;
            if (this.position.x < -boundX && fleeDirX < 0) fleeDirX = 0.6;
            if (this.position.z > boundZ && fleeDirZ > 0) fleeDirZ = -0.6;
            if (this.position.z < -boundZ && fleeDirZ < 0) fleeDirZ = 0.6;

            this.rotationY = Math.atan2(-fleeDirX, -fleeDirZ);

            const moveStep = this.fleeSpeed * dt;
            const nextX = this.position.x - Math.sin(this.rotationY) * moveStep;
            const nextZ = this.position.z - Math.cos(this.rotationY) * moveStep;

            if (!this.room.checkCollision(nextX, nextZ, 0.4)) {
                this.position.x = nextX;
                this.position.z = nextZ;
            } else {
                if (!this.room.checkCollision(nextX, this.position.z, 0.4)) this.position.x = nextX;
                else if (!this.room.checkCollision(this.position.x, nextZ, 0.4)) this.position.z = nextZ;
                else this.rotationY += Math.PI * 0.5;
            }

        } else {
            this.state = 'ROAMING';
            if (this.exclamationMesh) this.exclamationMesh.visible = false;

            if (this.pauseTimer > 0) {
                this.pauseTimer -= dt;
            } else {
                const distToTarget = Math.hypot(this.wanderTarget.x - this.position.x, this.wanderTarget.z - this.position.z);
                if (distToTarget < 1.2) {
                    this.pauseTimer = 0.3 + Math.random() * 0.6;
                    this.pickNewWanderTarget();
                } else {
                    const toTargetX = this.wanderTarget.x - this.position.x;
                    const toTargetZ = this.wanderTarget.z - this.position.z;
                    const desiredAngle = Math.atan2(-toTargetX, -toTargetZ);

                    let diff = desiredAngle - this.rotationY;
                    while (diff < -Math.PI) diff += Math.PI * 2;
                    while (diff > Math.PI) diff -= Math.PI * 2;
                    this.rotationY += diff * Math.min(1, dt * 5.0);

                    const moveStep = this.speed * dt;
                    const nextX = this.position.x - Math.sin(this.rotationY) * moveStep;
                    const nextZ = this.position.z - Math.cos(this.rotationY) * moveStep;

                    if (!this.room.checkCollision(nextX, nextZ, 0.4)) {
                        this.position.x = nextX;
                        this.position.z = nextZ;
                    } else {
                        this.pickNewWanderTarget();
                    }
                }
            }
        }

        const limitX = this.room.roomWidth / 2 - 1.2;
        const limitZ = this.room.roomDepth / 2 - 1.2;
        this.position.x = Math.max(-limitX, Math.min(limitX, this.position.x));
        this.position.z = Math.max(-limitZ, Math.min(limitZ, this.position.z));

        const isMoving = this.pauseTimer <= 0 || this.state === 'FLEEING';
        if (isMoving) {
            this.walkCycle += dt * (this.state === 'FLEEING' ? 22 : 14);
            this.mesh.position.set(this.position.x, Math.abs(Math.sin(this.walkCycle)) * 0.05, this.position.z);
        } else {
            this.mesh.position.set(this.position.x, 0, this.position.z);
        }
        this.mesh.rotation.y = this.rotationY;
        this.tail.rotation.y = Math.sin(this.walkCycle * 0.8) * 0.35;
        if (this.halo) this.halo.rotation.y += dt * 3;
    }

    destroy() {
        this.scene.remove(this.mesh);
    }
}
