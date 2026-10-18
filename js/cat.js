import * as THREE from 'three';
import { buildOutfit, buildBlasterModel } from './outfits.js';
import { createNameTagTexture } from './textures.js';

// --- Vincenzo (The 3D Cat with Name Tag) ---
export const DEFAULT_CAT_APPEARANCE = {
    name: 'Vincenzo',
    fur: 0xffffff,
    spots: 0xd63031,
    eyes: 0x2ecc71,
    pattern: 'spots', // 'spots' (two spots near the tail), 'stripes' (tabby stripes in the spots color) or 'plain'
    outfits: [],
    blaster: false
};

export class Cat {
    constructor(scene, appearance = DEFAULT_CAT_APPEARANCE) {
        this.scene = scene;
        this.mesh = new THREE.Group();

        this.position = new THREE.Vector3(0, 0, 2);
        this.rotationY = 0;
        this.speed = 0;
        this.maxSpeed = 7.5;
        this.sprintSpeed = 13.0;
        this.acceleration = 24.0;
        this.friction = 14.0;
        this.angularSpeed = 4.2;

        this.isSprinting = false;
        this.isPouncing = false;
        this.pounceTimer = 0;
        this.pounceCooldown = 0;
        this.stamina = 100;
        this.maxStamina = 100;
        this.speedBoost = 1.0; // Multiplier from shop "Zoomies" boost
        this.sneezeTimer = 0;

        this.walkCycle = 0;

        this.appearance = { ...DEFAULT_CAT_APPEARANCE, ...appearance };
        this.buildModel();
        this.scene.add(this.mesh);
    }

    // Rebuilds the cat with a new look (fur/spot/eye colors, name, outfits, blaster)
    setAppearance(appearance) {
        this.appearance = { ...DEFAULT_CAT_APPEARANCE, ...appearance };
        while (this.mesh.children.length > 0) {
            this.mesh.remove(this.mesh.children[0]);
        }
        this.buildModel();
    }

    // Two spots on the back near the tail
    addTorsoSpots(spotMat) {
        // Red Spot 1 (Left back near tail)
        const spot1Geo = new THREE.SphereGeometry(0.2, 12, 8);
        spot1Geo.scale(1.0, 0.25, 1.2);
        const spot1 = new THREE.Mesh(spot1Geo, spotMat);
        spot1.position.set(-0.16, 0.33, 0.38);
        spot1.rotation.set(-0.2, 0.15, 0.35);
        this.bodyGroup.add(spot1);

        // Red Spot 2 (Right back near tail)
        const spot2Geo = new THREE.SphereGeometry(0.18, 12, 8);
        spot2Geo.scale(1.1, 0.25, 1.0);
        const spot2 = new THREE.Mesh(spot2Geo, spotMat);
        spot2.position.set(0.15, 0.34, 0.46);
        spot2.rotation.set(-0.25, -0.15, -0.35);
        this.bodyGroup.add(spot2);
    }

    // Tabby stripes: half rings over the back that follow the shape of the torso
    addTorsoStripes(stripeMat) {
        const radiusX = 0.55 * 0.8;
        const radiusY = 0.55 * 0.75;
        const halfLength = 0.55 * 1.4;
        [-0.4, -0.12, 0.16, 0.42].forEach(z => {
            const r = radiusX * Math.sqrt(1 - (z / halfLength) ** 2) * 1.02;
            const stripe = new THREE.Mesh(new THREE.TorusGeometry(r, 0.035, 6, 20, Math.PI * 1.3), stripeMat);
            stripe.rotation.z = -Math.PI * 0.15;
            stripe.scale.y = radiusY / radiusX;
            stripe.position.z = z;
            this.bodyGroup.add(stripe);
        });
    }

    buildModel() {
        const look = this.appearance;
        const whiteFur = new THREE.MeshStandardMaterial({ color: look.fur, roughness: 0.45 });
        const redSpotMat = new THREE.MeshStandardMaterial({ color: look.spots, roughness: 0.5 }); // Spots or stripes
        const pinkMat = new THREE.MeshStandardMaterial({ color: 0xffb8b8, roughness: 0.7 });
        const eyeMat = new THREE.MeshStandardMaterial({ color: look.eyes, roughness: 0.1, emissive: look.eyes, emissiveIntensity: 0.3 });
        const collarMat = new THREE.MeshStandardMaterial({ color: 0xe74c3c, roughness: 0.3 });
        const bellMat = new THREE.MeshStandardMaterial({ color: 0xf1c40f, metalness: 0.8, roughness: 0.2 });

        this.bodyGroup = new THREE.Group();
        this.bodyGroup.position.y = 0.55;

        // White Torso
        const torsoGeo = new THREE.SphereGeometry(0.55, 16, 12);
        torsoGeo.scale(0.8, 0.75, 1.4);
        const torso = new THREE.Mesh(torsoGeo, whiteFur);
        torso.castShadow = true;
        this.bodyGroup.add(torso);

        if (look.pattern === 'stripes') {
            this.addTorsoStripes(redSpotMat);
        } else if (look.pattern !== 'plain') {
            this.addTorsoSpots(redSpotMat);
        }

        // White Head
        this.headGroup = new THREE.Group();
        this.headGroup.position.set(0, 0.45, -0.85);

        const headGeo = new THREE.SphereGeometry(0.42, 16, 14);
        const head = new THREE.Mesh(headGeo, whiteFur);
        head.castShadow = true;
        this.headGroup.add(head);

        // Three stripes on the forehead
        if (look.pattern === 'stripes') {
            [-0.13, 0, 0.13].forEach(x => {
                const stripeGeo = new THREE.SphereGeometry(0.1, 10, 8);
                stripeGeo.scale(0.35, 0.3, 1.5);
                const stripe = new THREE.Mesh(stripeGeo, redSpotMat);
                stripe.position.set(x, 0.37, -0.17);
                stripe.rotation.x = 0.45;
                this.headGroup.add(stripe);
            });
        }

        // White Snout
        const muzzleGeo = new THREE.SphereGeometry(0.2, 12, 10);
        muzzleGeo.scale(1.2, 0.8, 1.1);
        const muzzle = new THREE.Mesh(muzzleGeo, whiteFur);
        muzzle.position.set(0, -0.1, -0.32);
        this.headGroup.add(muzzle);

        // Pink Nose
        const nose = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.08, 4), pinkMat);
        nose.rotation.x = Math.PI / 2;
        nose.position.set(0, -0.04, -0.5);
        this.headGroup.add(nose);

        // Pointy White Ears with Pink Inner Lining
        const earGeo = new THREE.ConeGeometry(0.18, 0.36, 4);
        const earInnerGeo = new THREE.ConeGeometry(0.12, 0.28, 4);

        const earL = new THREE.Mesh(earGeo, whiteFur);
        earL.position.set(-0.25, 0.4, -0.05);
        earL.rotation.z = 0.25;
        earL.rotation.x = -0.1;
        this.headGroup.add(earL);

        const innerEarL = new THREE.Mesh(earInnerGeo, pinkMat);
        innerEarL.position.set(-0.25, 0.38, -0.08);
        innerEarL.rotation.z = 0.25;
        this.headGroup.add(innerEarL);

        const earR = new THREE.Mesh(earGeo, whiteFur);
        earR.position.set(0.25, 0.4, -0.05);
        earR.rotation.z = -0.25;
        earR.rotation.x = -0.1;
        this.headGroup.add(earR);

        const innerEarR = new THREE.Mesh(earInnerGeo, pinkMat);
        innerEarR.position.set(0.25, 0.38, -0.08);
        innerEarR.rotation.z = -0.25;
        this.headGroup.add(innerEarR);

        // Eyes
        const eyeGeo = new THREE.SphereGeometry(0.09, 12, 12);
        const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
        eyeL.position.set(-0.16, 0.08, -0.35);
        this.headGroup.add(eyeL);

        const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
        eyeR.position.set(0.16, 0.08, -0.35);
        this.headGroup.add(eyeR);

        // Dark Whiskers (visible against white fur)
        const whiskerMat = new THREE.LineBasicMaterial({ color: 0x2f3542 });
        const whiskerGeoL = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0), new THREE.Vector3(-0.4, 0.05, -0.1),
            new THREE.Vector3(0, -0.04, 0), new THREE.Vector3(-0.4, -0.06, -0.1)
        ]);
        const whiskerL = new THREE.LineSegments(whiskerGeoL, whiskerMat);
        whiskerL.position.set(-0.15, -0.1, -0.38);
        this.headGroup.add(whiskerL);

        const whiskerGeoR = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.4, 0.05, -0.1),
            new THREE.Vector3(0, -0.04, 0), new THREE.Vector3(0.4, -0.06, -0.1)
        ]);
        const whiskerR = new THREE.LineSegments(whiskerGeoR, whiskerMat);
        whiskerR.position.set(0.15, -0.1, -0.38);
        this.headGroup.add(whiskerR);

        // Collar & Bell
        const collar = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.06, 8, 20), collarMat);
        collar.rotation.x = Math.PI / 2;
        collar.position.set(0, -0.25, -0.05);
        this.headGroup.add(collar);

        const bell = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 10), bellMat);
        bell.position.set(0, -0.34, -0.28);
        this.headGroup.add(bell);

        // Shop outfits (hats, beards, glasses, bow ties...)
        let outfitTop = 0; // Highest point of any outfit, in headGroup space
        look.outfits.forEach(builderName => {
            const piece = buildOutfit(builderName);
            if (!piece) return;
            this.headGroup.add(piece);
            piece.updateMatrix();
            const box = new THREE.Box3().setFromObject(piece);
            outfitTop = Math.max(outfitTop, box.max.y);
        });

        this.bodyGroup.add(this.headGroup);

        // Brokjes Blaster strapped to the back
        if (look.blaster) {
            const blaster = buildBlasterModel();
            blaster.position.set(0.36, 0.3, -0.1);
            this.bodyGroup.add(blaster);
        }

        // White Legs
        this.legs = [];
        const legPositions = [
            { x: -0.3, z: -0.45, name: 'FL' },
            { x: 0.3, z: -0.45, name: 'FR' },
            { x: -0.3, z: 0.5, name: 'BL' },
            { x: 0.3, z: 0.5, name: 'BR' }
        ];

        legPositions.forEach(lp => {
            const legGroup = new THREE.Group();
            legGroup.position.set(lp.x, -0.15, lp.z);

            const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.09, 0.4), whiteFur);
            upper.position.y = -0.12;
            upper.castShadow = true;
            legGroup.add(upper);

            const paw = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), whiteFur);
            paw.scale.set(1, 0.7, 1.3);
            paw.position.set(0, -0.32, -0.04);
            paw.castShadow = true;
            legGroup.add(paw);

            this.bodyGroup.add(legGroup);
            this.legs.push({ group: legGroup, origY: -0.15, name: lp.name });
        });

        // White Tail
        this.tailSegments = [];
        let parent = this.bodyGroup;
        let currentZ = 0.75;
        for (let s = 0; s < 4; s++) {
            const segGroup = new THREE.Group();
            if (s === 0) segGroup.position.set(0, 0.2, currentZ);
            else segGroup.position.set(0, 0.18, 0.22);

            const segMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.07 - s * 0.012, 0.08 - s * 0.012, 0.3), whiteFur);
            segMesh.rotation.x = Math.PI / 3;
            segMesh.position.set(0, 0.1, 0.1);
            segMesh.castShadow = true;
            segGroup.add(segMesh);

            // Striped cats get a ring around each tail segment
            if (look.pattern === 'stripes') {
                const ring = new THREE.Mesh(new THREE.TorusGeometry(0.08 - s * 0.012, 0.025, 6, 14), redSpotMat);
                ring.rotation.x = Math.PI / 2;
                segMesh.add(ring);
            }

            parent.add(segGroup);
            this.tailSegments.push(segGroup);
            parent = segGroup;
        }

        this.mesh.add(this.bodyGroup);

        // FLOATING NAME TAG: "🐾 <name>"
        const nameTagMat = new THREE.SpriteMaterial({
            map: createNameTagTexture(look.name),
            transparent: true,
            depthTest: false
        });
        this.nameTag = new THREE.Sprite(nameTagMat);
        this.nameTag.scale.set(1.7, 0.46, 1);
        // Float the name tag above tall hats so it doesn't hide them
        const hatClearance = Math.max(0, outfitTop - 0.45);
        this.nameTag.position.set(0, 1.55 + hatClearance, -0.6);
        this.mesh.add(this.nameTag);
    }

    triggerPounce() {
        if (this.pounceCooldown > 0) return;
        this.isPouncing = true;
        this.pounceTimer = 0.35;
        this.pounceCooldown = 0.6;
        this.speed = Math.max(this.speed, 14.0);
    }

    triggerSneeze() {
        this.sneezeTimer = 0.5;
    }

    update(dt, input, room) {
        if (input.sprint && this.stamina > 10 && (input.forward || input.backward)) {
            this.isSprinting = true;
            this.stamina = Math.max(0, this.stamina - 30 * dt);
        } else {
            this.isSprinting = false;
            this.stamina = Math.min(this.maxStamina, this.stamina + 20 * dt);
        }

        if (this.pounceCooldown > 0) this.pounceCooldown -= dt;

        if (this.isPouncing) {
            this.pounceTimer -= dt;
            if (this.pounceTimer <= 0) {
                this.isPouncing = false;
            }
        }

        if (input.turnLeft) {
            this.rotationY += this.angularSpeed * dt;
        }
        if (input.turnRight) {
            this.rotationY -= this.angularSpeed * dt;
        }

        const topSpeed = (this.isSprinting ? this.sprintSpeed : this.maxSpeed) * this.speedBoost;
        if (input.forward) {
            this.speed = Math.min(topSpeed, this.speed + this.acceleration * dt);
        } else if (input.backward) {
            this.speed = Math.max(-topSpeed * 0.5, this.speed - this.acceleration * dt);
        } else {
            if (this.speed > 0) {
                this.speed = Math.max(0, this.speed - this.friction * dt);
            } else if (this.speed < 0) {
                this.speed = Math.min(0, this.speed + this.friction * dt);
            }
        }

        const moveStep = this.speed * dt;
        const nextX = this.position.x - Math.sin(this.rotationY) * moveStep;
        const nextZ = this.position.z - Math.cos(this.rotationY) * moveStep;

        if (!room.checkCollision(nextX, this.position.z, 0.6)) {
            this.position.x = nextX;
        } else {
            this.speed *= 0.5;
        }

        if (!room.checkCollision(this.position.x, nextZ, 0.6)) {
            this.position.z = nextZ;
        } else {
            this.speed *= 0.5;
        }

        let leapY = 0;
        if (this.isPouncing) {
            leapY = Math.sin((1 - this.pounceTimer / 0.35) * Math.PI) * 0.9;
        }

        this.mesh.position.set(this.position.x, this.position.y + leapY, this.position.z);
        this.mesh.rotation.y = this.rotationY;

        const isMoving = Math.abs(this.speed) > 0.1;
        if (isMoving) {
            this.walkCycle += dt * this.speed * 4.5;
            const swing = Math.sin(this.walkCycle) * 0.6;

            this.legs[0].group.rotation.x = swing;
            this.legs[1].group.rotation.x = -swing;
            this.legs[2].group.rotation.x = -swing;
            this.legs[3].group.rotation.x = swing;

            this.bodyGroup.position.y = 0.55 + Math.abs(Math.sin(this.walkCycle * 2)) * 0.08;
        } else {
            this.legs.forEach(l => l.group.rotation.x *= 0.85);
            this.bodyGroup.position.y = 0.55;
        }

        const tailTime = Date.now() * 0.005;
        this.tailSegments.forEach((seg, i) => {
            seg.rotation.y = Math.sin(tailTime + i * 0.4) * 0.25;
            seg.rotation.z = Math.cos(tailTime + i * 0.3) * 0.12;
        });

        if (input.turnLeft) this.headGroup.rotation.y = 0.25;
        else if (input.turnRight) this.headGroup.rotation.y = -0.25;
        else this.headGroup.rotation.y *= 0.8;

        // Sneeze: head snaps back then forward
        if (this.sneezeTimer > 0) {
            this.sneezeTimer = Math.max(0, this.sneezeTimer - dt);
            const p = 1 - this.sneezeTimer / 0.5;
            if (p < 0.35) this.headGroup.rotation.x = -0.5 * (p / 0.35);
            else if (p < 0.5) this.headGroup.rotation.x = -0.5 + 0.95 * ((p - 0.35) / 0.15);
            else this.headGroup.rotation.x = 0.45 * (1 - (p - 0.5) / 0.5);
        } else {
            this.headGroup.rotation.x = 0;
        }
    }
}
