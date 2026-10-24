import * as THREE from 'three';
import {
    createParquetTexture, createAtticFloorTexture, createBasementFloorTexture,
    createBasementWallTexture, createKitchenFloorTexture, createKitchenWallTexture,
    createCarpetTexture, createBedroomWallTexture,
    createRugTexture, createTVCanvasTexture,
    createGrassTexture, createFenceTexture, createConcreteTexture, createCorrugatedMetalTexture,
    createSupermarketFloorTexture, createSupermarketWallTexture, createDeckTexture, createHullTexture,
    createWaterTexture, createSpaceFloorTexture, createSpaceWallTexture, createDoorSignTexture,
    createProductsTexture, createStarfieldTexture, createPawFlagTexture
} from './textures.js';

// Indoor rooms share this dark backdrop; outdoor environments set their own "sky"
const DEFAULT_SKY = 0x12141a;
const DEFAULT_FOG_DENSITY = 0.018;
const DEFAULT_WALL_HEIGHT = 8;

// Endless-mode door: how close (along the wall) the cat must be to walk through
const DOOR_HALF_WIDTH = 1.5;

// Shorthands for the prop builders below
function std(color, extra = {}) {
    return new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...extra });
}

function addMesh(parent, geometry, material, x = 0, y = 0, z = 0) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
}

// Pitched roof: a box turned 45 degrees and squashed, so only the top half pokes out
function addRoof(parent, width, depth, y, height, material) {
    const holder = new THREE.Group();
    holder.position.y = y;
    holder.scale.y = height / (width / 2);
    const side = width / Math.SQRT2;
    const roof = addMesh(holder, new THREE.BoxGeometry(side, side, depth), material);
    roof.rotation.z = Math.PI / 4;
    parent.add(holder);
    return holder;
}

// --- Dynamic Multi-Level Room Environment Builder ---
export class LevelEnvironment {
    constructor(scene) {
        this.scene = scene;
        this.roomGroup = new THREE.Group();
        this.lightsGroup = new THREE.Group();
        this.scene.add(this.roomGroup);
        this.scene.add(this.lightsGroup);

        this.colliders = [];
        this.roomWidth = 34;
        this.roomDepth = 26;
        this.wallHeight = DEFAULT_WALL_HEIGHT;
        this.tvTexture = null;
        this.currentLevel = 1;
        this.zeroGravity = false;
        this.animators = []; // functions (dt, time) for moving decorations
        this.doors = [];     // endless-mode doors to other rooms
    }

    clearCurrentLevel() {
        // Remove previous objects
        while (this.roomGroup.children.length > 0) {
            const obj = this.roomGroup.children[0];
            this.roomGroup.remove(obj);
        }
        while (this.lightsGroup.children.length > 0) {
            const light = this.lightsGroup.children[0];
            this.lightsGroup.remove(light);
        }
        this.colliders = [];
        this.tvTexture = null;
        this.productsTexture = null;
        this.zeroGravity = false;
        this.animators = [];
        this.doors = [];
        this.wallHeight = DEFAULT_WALL_HEIGHT;
    }

    // Called every frame: animated TV, clouds, waves, reactor rings, door mats...
    update(dt) {
        if (this.tvTexture && this.tvTexture.updateAnimation) this.tvTexture.updateAnimation();
        const time = performance.now() / 1000;
        this.animators.forEach(fn => fn(dt, time));
    }

    // Registers a decoration animation for the current room
    animate(fn) {
        this.animators.push(fn);
    }

    /**
     * Builds the level by fetching the environment JSON file referenced in the
     * level config. If no environment file is specified or the fetch fails,
     * the room stays empty.
     *
     * @param {number} lvl - Level number
     * @param {object|null} cfg - Level config object from levels.json (may be null)
     */
    async buildLevel(lvl, cfg) {
        this.clearCurrentLevel();
        this.currentLevel = lvl;

        const environmentFile = cfg && cfg.environment ? cfg.environment : null;

        if (environmentFile) {
            try {
                const response = await fetch(environmentFile);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const envData = await response.json();
                this._buildFromData(envData);
                return;
            } catch (err) {
                console.warn(`Could not load environment file "${environmentFile}", the room stays empty:`, err);
            }
        }
    }

    /**
     * Builds the environment from a parsed environment JSON data object.
     * @param {object} envData
     */
    _buildFromData(envData) {
        // --- Sky & fog (outdoor rooms and space set their own) ---
        const sky = envData.sky ? parseInt(envData.sky, 16) : DEFAULT_SKY;
        this.scene.background.setHex(sky);
        this.scene.fog.color.setHex(envData.fogColor ? parseInt(envData.fogColor, 16) : sky);
        this.scene.fog.density = envData.fogDensity !== undefined ? envData.fogDensity : DEFAULT_FOG_DENSITY;

        // Spaceship: cat and mice float (see Cat.update and Mouse.update)
        this.zeroGravity = !!envData.zeroGravity;

        // --- Lights ---
        if (envData.lights) {
            for (const lightDef of envData.lights) {
                const color = parseInt(lightDef.color, 16);
                let light;
                if (lightDef.type === 'ambient') {
                    light = new THREE.AmbientLight(color, lightDef.intensity);
                } else if (lightDef.type === 'directional') {
                    light = new THREE.DirectionalLight(color, lightDef.intensity);
                    if (lightDef.position) light.position.set(...lightDef.position);
                    if (lightDef.castShadow) {
                        light.castShadow = true;
                        const mapSize = lightDef.shadowMapSize || 1024;
                        light.shadow.mapSize.width = mapSize;
                        light.shadow.mapSize.height = mapSize;
                        if (lightDef.shadowCameraSize) {
                            const d = lightDef.shadowCameraSize;
                            light.shadow.camera.left = -d;
                            light.shadow.camera.right = d;
                            light.shadow.camera.top = d;
                            light.shadow.camera.bottom = -d;
                        }
                    }
                } else if (lightDef.type === 'point') {
                    light = new THREE.PointLight(color, lightDef.intensity, lightDef.distance || 10);
                    if (lightDef.position) light.position.set(...lightDef.position);
                } else if (lightDef.type === 'hemisphere') {
                    // Outdoor light: sky color from above, ground color from below
                    light = new THREE.HemisphereLight(color, parseInt(lightDef.groundColor || '0x444444', 16), lightDef.intensity);
                }
                if (light) this.lightsGroup.add(light);
            }
        }

        // --- Floor ---
        if (envData.floor) {
            const f = envData.floor;
            let floorMat;
            if (f.texture) {
                floorMat = new THREE.MeshStandardMaterial({
                    map: this._resolveTexture(f.texture),
                    roughness: f.roughness !== undefined ? f.roughness : 0.5,
                    metalness: f.metalness !== undefined ? f.metalness : 0
                });
            } else {
                floorMat = new THREE.MeshStandardMaterial({
                    color: parseInt(f.color, 16),
                    roughness: f.roughness !== undefined ? f.roughness : 0.5
                });
            }
            const floor = new THREE.Mesh(new THREE.PlaneGeometry(this.roomWidth, this.roomDepth), floorMat);
            floor.rotation.x = -Math.PI / 2;
            floor.receiveShadow = true;
            this.roomGroup.add(floor);
        }

        // --- Ceiling ---
        if (envData.ceiling) {
            const c = envData.ceiling;
            const ceilMat = new THREE.MeshStandardMaterial({
                color: parseInt(c.color, 16),
                roughness: c.roughness !== undefined ? c.roughness : 0.9
            });
            const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(this.roomWidth, this.roomDepth), ceilMat);
            ceiling.position.y = this.wallHeight;
            ceiling.rotation.x = Math.PI / 2;
            this.roomGroup.add(ceiling);
        }

        // --- Walls ---
        if (envData.walls) {
            const w = envData.walls;
            // Low walls for fences and boat railings
            if (w.height) this.wallHeight = w.height;
            let wallMat;
            if (w.texture) {
                wallMat = new THREE.MeshStandardMaterial({
                    map: this._resolveTexture(w.texture),
                    roughness: w.roughness !== undefined ? w.roughness : 0.7
                });
            } else {
                wallMat = new THREE.MeshStandardMaterial({
                    color: parseInt(w.color, 16),
                    roughness: w.roughness !== undefined ? w.roughness : 0.7
                });
            }
            this.createRoomWalls(wallMat);
        }

        // --- Extras (special built-in decorations) ---
        if (envData.extras) {
            for (const extra of envData.extras) {
                this._buildExtra(extra);
            }
        }

        // --- Props ---
        if (envData.props) {
            for (const prop of envData.props) {
                this._buildProp(prop);
            }
        }
    }

    /**
     * Resolves a texture name string to a Three.js texture by calling the
     * corresponding procedural texture factory function.
     * @param {string} textureName
     * @returns {THREE.Texture|null}
     */
    _resolveTexture(textureName) {
        switch (textureName) {
            case 'parquet':         return createParquetTexture();
            case 'rug':             return createRugTexture();
            case 'atticFloor':      return createAtticFloorTexture();
            case 'basementFloor':   return createBasementFloorTexture();
            case 'basementWall':    return createBasementWallTexture();
            case 'kitchenFloor':    return createKitchenFloorTexture();
            case 'kitchenWall':     return createKitchenWallTexture();
            case 'carpet':          return createCarpetTexture();
            case 'bedroomWall':     return createBedroomWallTexture();
            case 'grass':           return createGrassTexture();
            case 'fence':           return createFenceTexture();
            case 'concrete':        return createConcreteTexture();
            case 'corrugatedMetal': return createCorrugatedMetalTexture();
            case 'supermarketFloor':return createSupermarketFloorTexture();
            case 'supermarketWall': return createSupermarketWallTexture();
            case 'deck':            return createDeckTexture();
            case 'hull':            return createHullTexture();
            case 'spaceFloor':      return createSpaceFloorTexture();
            case 'spaceWall':       return createSpaceWallTexture();
            default:
                console.warn(`Unknown texture name: "${textureName}"`);
                return null;
        }
    }

    /**
     * Builds a special/extra element defined by type in the extras array.
     * @param {object} extra
     */
    _buildExtra(extra) {
        switch (extra.type) {
            case 'rug': {
                const rugMat = new THREE.MeshStandardMaterial({ map: createRugTexture(), roughness: 0.85 });
                const rug = new THREE.Mesh(new THREE.PlaneGeometry(...extra.size), rugMat);
                rug.rotation.x = -Math.PI / 2;
                rug.position.set(...extra.position);
                rug.receiveShadow = true;
                this.roomGroup.add(rug);
                break;
            }
            case 'atticRafters': {
                const beamMat = new THREE.MeshStandardMaterial({ color: 0x3d2f26, roughness: 0.8 });
                for (let z = -11; z <= 11; z += 5.5) {
                    const beamL = new THREE.Mesh(new THREE.BoxGeometry(0.5, 8.5, 0.5), beamMat);
                    beamL.position.set(-7.5, 5.0, z);
                    beamL.rotation.z = -0.45;
                    beamL.castShadow = true;
                    this.roomGroup.add(beamL);

                    const beamR = new THREE.Mesh(new THREE.BoxGeometry(0.5, 8.5, 0.5), beamMat);
                    beamR.position.set(7.5, 5.0, z);
                    beamR.rotation.z = 0.45;
                    beamR.castShadow = true;
                    this.roomGroup.add(beamR);

                    const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(16, 0.4, 0.5), beamMat);
                    crossBeam.position.set(0, 6.8, z);
                    this.roomGroup.add(crossBeam);
                }
                break;
            }
            case 'atticGableWindow': {
                const winMat = new THREE.MeshBasicMaterial({ color: 0x48dbfb });
                const winMesh = new THREE.Mesh(new THREE.CircleGeometry(2.2, 16), winMat);
                winMesh.position.set(0, 5.2, -this.roomDepth / 2 + 0.1);
                this.roomGroup.add(winMesh);
                break;
            }
            case 'basementPipes': {
                const pipeMat = new THREE.MeshStandardMaterial({ color: 0x7f8c8d, metalness: 0.8, roughness: 0.3 });
                const pipe1 = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, this.roomWidth), pipeMat);
                pipe1.rotation.z = Math.PI / 2;
                pipe1.position.set(0, 7.2, -6);
                this.roomGroup.add(pipe1);

                const pipe2 = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, this.roomDepth), pipeMat);
                pipe2.rotation.x = Math.PI / 2;
                pipe2.position.set(8, 7.4, 0);
                this.roomGroup.add(pipe2);
                break;
            }
            case 'bedroomWindow': {
                // Night window on the back wall with a full moon
                const frameMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
                const frame = new THREE.Mesh(new THREE.BoxGeometry(3.6, 3.0, 0.15), frameMat);
                frame.position.set(...extra.position);
                this.roomGroup.add(frame);
                const sky = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.6), new THREE.MeshBasicMaterial({ color: 0x0c2461 }));
                sky.position.set(extra.position[0], extra.position[1], extra.position[2] + 0.08);
                this.roomGroup.add(sky);
                const moon = new THREE.Mesh(new THREE.CircleGeometry(0.45, 20), new THREE.MeshBasicMaterial({ color: 0xfff6c8 }));
                moon.position.set(extra.position[0] + 0.8, extra.position[1] + 0.55, extra.position[2] + 0.1);
                this.roomGroup.add(moon);
                const bar = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.6, 0.05), frameMat);
                bar.position.set(extra.position[0], extra.position[1], extra.position[2] + 0.12);
                this.roomGroup.add(bar);
                break;
            }
            case 'ceilingStars': {
                // Glow-in-the-dark stickers on the ceiling
                const starMat = new THREE.MeshBasicMaterial({ color: 0xc8f7c5 });
                for (let i = 0; i < 40; i++) {
                    const star = new THREE.Mesh(new THREE.CircleGeometry(0.12 + (i % 3) * 0.05, 5), starMat);
                    star.rotation.x = Math.PI / 2;
                    star.position.set(Math.sin(i * 12.9898) * 15, this.wallHeight - 0.02, Math.cos(i * 78.233) * 11);
                    this.roomGroup.add(star);
                }
                break;
            }
            case 'clouds': {
                // Fluffy clouds drifting slowly across the sky
                const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, emissive: 0xffffff, emissiveIntensity: 0.25 });
                const clouds = [];
                for (let i = 0; i < 9; i++) {
                    const cloud = new THREE.Group();
                    for (let p = 0; p < 4; p++) {
                        const puff = new THREE.Mesh(new THREE.SphereGeometry(2.2 + (p % 2), 10, 8), cloudMat);
                        puff.position.set(p * 2.4 - 3.6, (p % 2) * 0.8, (p % 3) * 0.6);
                        cloud.add(puff);
                    }
                    cloud.position.set(-70 + i * 17, 26 + (i % 3) * 4, -55 + ((i * 37) % 110));
                    this.roomGroup.add(cloud);
                    clouds.push(cloud);
                }
                this.animate(dt => clouds.forEach(c => {
                    c.position.x += dt * 1.2;
                    if (c.position.x > 80) c.position.x = -80;
                }));
                break;
            }
            case 'sun': {
                const sun = new THREE.Mesh(new THREE.SphereGeometry(5, 20, 16), new THREE.MeshBasicMaterial({ color: 0xfff3b0, fog: false }));
                sun.position.set(...(extra.position || [45, 50, -70]));
                this.roomGroup.add(sun);
                break;
            }
            case 'distantTrees': {
                // Pine trees and bushes beyond the fence
                const leafMat = new THREE.MeshStandardMaterial({ color: 0x2d6a4f, roughness: 0.9 });
                const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6d4c41, roughness: 0.9 });
                for (let i = 0; i < 28; i++) {
                    const a = (i / 28) * Math.PI * 2;
                    const r = 26 + (i % 4) * 4;
                    const tx = Math.cos(a) * r * 1.2;
                    const tz = Math.sin(a) * r;
                    const h = 6 + (i % 3) * 2.5;
                    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 2), trunkMat);
                    trunk.position.set(tx, 1, tz);
                    const crown = new THREE.Mesh(new THREE.ConeGeometry(2.4, h, 10), leafMat);
                    crown.position.set(tx, 2 + h / 2, tz);
                    this.roomGroup.add(trunk, crown);
                }
                // Grass outside the fence too
                const outside = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: 0x4a8a32, roughness: 1 }));
                outside.rotation.x = -Math.PI / 2;
                outside.position.y = -0.02;
                this.roomGroup.add(outside);
                break;
            }
            case 'cobwebs': {
                // Dusty spider webs in the upper corners
                const webMat = new THREE.LineBasicMaterial({ color: 0xdfe6e9, transparent: true, opacity: 0.45 });
                const top = this.wallHeight - 0.05;
                [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
                    const cx = sx * (this.roomWidth / 2 - 0.05);
                    const cz = sz * (this.roomDepth / 2 - 0.05);
                    const pts = [];
                    for (let i = 0; i <= 6; i++) {
                        const a = (i / 6) * (Math.PI / 2);
                        const end = new THREE.Vector3(cx - sx * Math.cos(a) * 2.6, top - Math.sin(a) * 2.6, cz);
                        pts.push(new THREE.Vector3(cx, top, cz), end);
                    }
                    for (let ring = 1; ring <= 3; ring++) {
                        for (let i = 0; i < 6; i++) {
                            const a1 = (i / 6) * (Math.PI / 2);
                            const a2 = ((i + 1) / 6) * (Math.PI / 2);
                            const r = ring * 0.8;
                            pts.push(new THREE.Vector3(cx - sx * Math.cos(a1) * r, top - Math.sin(a1) * r, cz));
                            pts.push(new THREE.Vector3(cx - sx * Math.cos(a2) * r, top - Math.sin(a2) * r, cz));
                        }
                    }
                    const web = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), webMat);
                    web.position.z = -sz * 0.05;
                    this.roomGroup.add(web);
                });
                break;
            }
            case 'skylightBeam': {
                // Broken skylight: a patch of sky in the ceiling and a dusty beam of light
                const [bx, bz] = extra.position || [4, 2];
                const hole = new THREE.Mesh(new THREE.PlaneGeometry(4, 3), new THREE.MeshBasicMaterial({ color: 0xbfe9ff }));
                hole.rotation.x = Math.PI / 2;
                hole.position.set(bx, this.wallHeight - 0.03, bz);
                this.roomGroup.add(hole);
                const beam = new THREE.Mesh(
                    new THREE.BoxGeometry(4, this.wallHeight, 3),
                    new THREE.MeshBasicMaterial({ color: 0xfff6c8, transparent: true, opacity: 0.08, depthWrite: false })
                );
                beam.position.set(bx, this.wallHeight / 2, bz);
                this.roomGroup.add(beam);
                const spot = new THREE.Mesh(new THREE.PlaneGeometry(4, 3), new THREE.MeshBasicMaterial({ color: 0xfff6c8, transparent: true, opacity: 0.18, depthWrite: false }));
                spot.rotation.x = -Math.PI / 2;
                spot.position.set(bx, 0.03, bz);
                this.roomGroup.add(spot);
                break;
            }
            case 'fluorescentLights': {
                // Rows of bright tube lights on the supermarket ceiling
                const tubeMat = new THREE.MeshBasicMaterial({ color: 0xf8fbff });
                const housingMat = new THREE.MeshStandardMaterial({ color: 0xb2bec3, roughness: 0.5 });
                for (let x = -12; x <= 12; x += 6) {
                    for (let z = -8; z <= 8; z += 8) {
                        const housing = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.15, 4.2), housingMat);
                        housing.position.set(x, this.wallHeight - 0.08, z);
                        const tube = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 4), tubeMat);
                        tube.position.set(x, this.wallHeight - 0.18, z);
                        this.roomGroup.add(housing, tube);
                    }
                }
                break;
            }
            case 'sea': {
                // Endless ocean around the boat with rolling waves
                const waterTex = createWaterTexture();
                const sea = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ map: waterTex, roughness: 0.25, metalness: 0.3 }));
                sea.rotation.x = -Math.PI / 2;
                sea.position.y = -0.8;
                this.roomGroup.add(sea);
                this.animate((dt, t) => {
                    waterTex.offset.x += dt * 0.01;
                    waterTex.offset.y = Math.sin(t * 0.4) * 0.02;
                    sea.position.y = -0.8 + Math.sin(t * 0.9) * 0.15;
                });
                break;
            }
            case 'seagulls': {
                const gullMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, side: THREE.DoubleSide });
                const gulls = [];
                for (let i = 0; i < 3; i++) {
                    const gull = new THREE.Group();
                    [-1, 1].forEach(side => {
                        const wing = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.4), gullMat);
                        wing.position.x = side * 0.65;
                        wing.rotation.z = side * 0.35;
                        gull.add(wing);
                    });
                    gull.add(new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), gullMat));
                    this.roomGroup.add(gull);
                    gulls.push({ gull, radius: 10 + i * 5, height: 14 + i * 2.5, speed: 0.3 + i * 0.12, phase: i * 2 });
                }
                this.animate((dt, t) => gulls.forEach(g => {
                    const a = t * g.speed + g.phase;
                    g.gull.position.set(Math.cos(a) * g.radius, g.height + Math.sin(t * 2 + g.phase) * 0.5, Math.sin(a) * g.radius);
                    g.gull.rotation.y = -a;
                    g.gull.children[0].rotation.z = -0.35 - Math.sin(t * 6 + g.phase) * 0.4;
                    g.gull.children[1].rotation.z = 0.35 + Math.sin(t * 6 + g.phase) * 0.4;
                }));
                break;
            }
            case 'lifebuoys': {
                // Orange-and-white life rings hanging on the railing
                const orange = new THREE.MeshStandardMaterial({ color: 0xff6b35, roughness: 0.5 });
                const white = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
                const spots = [[-10, -this.roomDepth / 2 + 0.25, 0], [10, this.roomDepth / 2 - 0.25, Math.PI], [this.roomWidth / 2 - 0.25, 6, -Math.PI / 2], [-this.roomWidth / 2 + 0.25, -6, Math.PI / 2]];
                spots.forEach(([px, pz, rot]) => {
                    const ring = new THREE.Group();
                    for (let i = 0; i < 4; i++) {
                        const seg = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.18, 8, 8, Math.PI / 2), i % 2 ? white : orange);
                        seg.rotation.z = (i * Math.PI) / 2;
                        ring.add(seg);
                    }
                    ring.position.set(px, 1.0, pz);
                    ring.rotation.y = rot;
                    this.roomGroup.add(ring);
                });
                break;
            }
            case 'spaceWindows': {
                // Big windows on the side walls looking out into deep space
                const starTex = createStarfieldTexture();
                const frameMat = new THREE.MeshStandardMaterial({ color: 0x57606f, metalness: 0.7, roughness: 0.3 });
                const viewMat = new THREE.MeshBasicMaterial({ map: starTex });
                [[-this.roomWidth / 2 + 0.06, Math.PI / 2], [this.roomWidth / 2 - 0.06, -Math.PI / 2]].forEach(([wx, rot]) => {
                    [-6, 6].forEach(wz => {
                        const win = new THREE.Group();
                        const frame = new THREE.Mesh(new THREE.BoxGeometry(7.4, 3.6, 0.1), frameMat);
                        const view = new THREE.Mesh(new THREE.PlaneGeometry(7, 3.2), viewMat);
                        view.position.z = 0.06;
                        win.add(frame, view);
                        win.position.set(wx, 4.6, wz);
                        win.rotation.y = rot;
                        this.roomGroup.add(win);
                    });
                });
                // Back wall: a round porthole
                const port = new THREE.Mesh(new THREE.CircleGeometry(2, 32), viewMat);
                port.position.set(-9, 4.4, this.roomDepth / 2 - 0.06);
                port.rotation.y = Math.PI;
                const ring = new THREE.Mesh(new THREE.TorusGeometry(2.05, 0.18, 8, 32), frameMat);
                ring.position.copy(port.position);
                this.roomGroup.add(port, ring);
                break;
            }
            case 'ceilingPanels': {
                // Glowing light panels on the spaceship ceiling
                const panelMat = new THREE.MeshBasicMaterial({ color: 0xc7ecee });
                for (let x = -12; x <= 12; x += 8) {
                    for (let z = -8; z <= 8; z += 8) {
                        const panel = new THREE.Mesh(new THREE.PlaneGeometry(3, 1.4), panelMat);
                        panel.rotation.x = Math.PI / 2;
                        panel.position.set(x, this.wallHeight - 0.02, z);
                        this.roomGroup.add(panel);
                    }
                }
                break;
            }
            default:
                console.warn(`Unknown extra type: "${extra.type}"`);
        }
    }

    /**
     * Dispatches a prop definition from the JSON to the appropriate builder method.
     * @param {object} prop
     */
    _buildProp(prop) {
        const x = prop.x !== undefined ? prop.x : 0;
        const z = prop.z !== undefined ? prop.z : 0;
        const y = prop.y !== undefined ? prop.y : 0;

        switch (prop.builder) {
            case 'sofa':             this.buildSofa(x, z); break;
            case 'coffeeTable':      this.buildCoffeeTable(x, z); break;
            case 'tvConsole':        this.buildTVConsole(x, z); break;
            case 'bookshelf':        this.buildBookshelf(x, z); break;
            case 'catTree':          this.buildCatTree(x, z); break;
            case 'armchair':         this.buildArmchair(x, z); break;
            case 'housePlant':       this.buildHousePlant(x, z); break;
            case 'floorLamp':        this.buildFloorLamp(x, z); break;
            case 'cardboardBoxStack':this.buildCardboardBoxStack(x, z); break;
            case 'vintageTrunk':     this.buildVintageTrunk(x, z, prop.rotY !== undefined ? prop.rotY : 0); break;
            case 'rockingChair':     this.buildRockingChair(x, z); break;
            case 'grandfatherClock': this.buildGrandfatherClock(x, z); break;
            case 'stepLadder':       this.buildStepLadder(x, z); break;
            case 'suitcaseStack':    this.buildSuitcaseStack(x, z); break;
            case 'atticLantern':     this.buildAtticLantern(x, y, z); break;
            case 'furnace':          this.buildFurnace(x, z); break;
            case 'barrelStack':      this.buildBarrelStack(x, z); break;
            case 'workbench':        this.buildWorkbench(x, z); break;
            case 'washingMachine':   this.buildWashingMachine(x, z); break;
            case 'palletWithCrates': this.buildPalletWithCrates(x, z); break;
            case 'hangingBulb':      this.buildHangingBulb(x, y, z); break;
            case 'kitchenCounter':   this.buildKitchenCounter(x, z); break;
            case 'stove':            this.buildStove(x, z); break;
            case 'fridge':           this.buildFridge(x, z); break;
            case 'kitchenIsland':    this.buildKitchenIsland(x, z); break;
            case 'diningTable':      this.buildDiningTable(x, z); break;
            case 'pantryShelf':      this.buildPantryShelf(x, z); break;
            case 'trashBin':         this.buildTrashBin(x, z); break;
            case 'catBowls':         this.buildCatBowls(x, z); break;
            case 'pendantLamp':      this.buildPendantLamp(x, y, z); break;
            case 'bed':              this.buildBed(x, z); break;
            case 'nightstand':       this.buildNightstand(x, z); break;
            case 'wardrobe':         this.buildWardrobe(x, z); break;
            case 'desk':             this.buildDesk(x, z); break;
            case 'toyBox':           this.buildToyBox(x, z); break;
            case 'beanBag':          this.buildBeanBag(x, z); break;
            case 'toyBlocks':        this.buildToyBlocks(x, z); break;
            case 'bigTree':          this.buildBigTree(x, z); break;
            case 'gardenShed':       this.buildGardenShed(x, z); break;
            case 'doghouse':         this.buildDoghouse(x, z); break;
            case 'sandbox':          this.buildSandbox(x, z); break;
            case 'barbecue':         this.buildBarbecue(x, z); break;
            case 'flowerBed':        this.buildFlowerBed(x, z); break;
            case 'birdBath':         this.buildBirdBath(x, z); break;
            case 'gardenGnome':      this.buildGardenGnome(x, z); break;
            case 'trampoline':       this.buildTrampoline(x, z); break;
            case 'oldCar':           this.buildOldCar(x, z); break;
            case 'toolWall':         this.buildToolWall(x, z); break;
            case 'tireStack':        this.buildTireStack(x, z); break;
            case 'sawHorse':         this.buildSawHorse(x, z); break;
            case 'oldGenerator':     this.buildOldGenerator(x, z); break;
            case 'groceryShelf':     this.buildGroceryShelf(x, z); break;
            case 'checkout':         this.buildCheckout(x, z); break;
            case 'freezer':          this.buildFreezer(x, z); break;
            case 'fruitStand':       this.buildFruitStand(x, z); break;
            case 'dairyFridge':      this.buildDairyFridge(x, z); break;
            case 'cheeseDisplay':    this.buildCheeseDisplay(x, z); break;
            case 'shoppingCart':     this.buildShoppingCart(x, z, prop.rotY || 0); break;
            case 'canPyramid':       this.buildCanPyramid(x, z); break;
            case 'mast':             this.buildMast(x, z); break;
            case 'captainCabin':     this.buildCaptainCabin(x, z); break;
            case 'shipWheel':        this.buildShipWheel(x, z); break;
            case 'cannon':           this.buildCannon(x, z, prop.rotY || 0); break;
            case 'ropeCoil':         this.buildRopeCoil(x, z); break;
            case 'treasureChest':    this.buildTreasureChest(x, z); break;
            case 'anchor':           this.buildAnchor(x, z); break;
            case 'controlConsole':   this.buildControlConsole(x, z); break;
            case 'cryoPod':          this.buildCryoPod(x, z); break;
            case 'reactorCore':      this.buildReactorCore(x, z); break;
            case 'floatingCrate':    this.buildFloatingCrate(x, prop.y !== undefined ? y : 2, z); break;
            case 'spaceRobot':       this.buildSpaceRobot(x, z); break;
            case 'plantPod':         this.buildPlantPod(x, z); break;
            case 'spaceSuitRack':    this.buildSpaceSuitRack(x, z); break;
            default:
                console.warn(`Unknown prop builder: "${prop.builder}"`);
        }
    }

    addCollider(x, z, w, d) {
        this.colliders.push({
            minX: x - w / 2,
            maxX: x + w / 2,
            minZ: z - d / 2,
            maxZ: z + d / 2
        });
    }

    checkCollision(x, z, radius) {
        const boundX = this.roomWidth / 2 - 0.7;
        const boundZ = this.roomDepth / 2 - 0.7;
        if (x < -boundX || x > boundX || z < -boundZ || z > boundZ) {
            return true;
        }

        for (const c of this.colliders) {
            if (x + radius > c.minX && x - radius < c.maxX &&
                z + radius > c.minZ && z - radius < c.maxZ) {
                return true;
            }
        }
        return false;
    }

    // Nearest spot to (x, z) where something of this radius doesn't overlap furniture
    findFreeSpot(x, z, radius) {
        if (!this.checkCollision(x, z, radius)) return { x, z };
        for (let r = 0.5; r < 14; r += 0.5) {
            for (let i = 0; i < 16; i++) {
                const a = (i / 16) * Math.PI * 2;
                const tx = x + Math.sin(a) * r;
                const tz = z + Math.cos(a) * r;
                if (!this.checkCollision(tx, tz, radius)) return { x: tx, z: tz };
            }
        }
        return { x, z };
    }

    // --- Helper Builders ---
    createRoomWalls(wallMat) {
        const northWall = new THREE.Mesh(new THREE.PlaneGeometry(this.roomWidth, this.wallHeight), wallMat);
        northWall.position.set(0, this.wallHeight / 2, -this.roomDepth / 2);
        northWall.receiveShadow = true;
        this.roomGroup.add(northWall);

        const southWall = new THREE.Mesh(new THREE.PlaneGeometry(this.roomWidth, this.wallHeight), wallMat);
        southWall.position.set(0, this.wallHeight / 2, this.roomDepth / 2);
        southWall.rotation.y = Math.PI;
        southWall.receiveShadow = true;
        this.roomGroup.add(southWall);

        const eastWall = new THREE.Mesh(new THREE.PlaneGeometry(this.roomDepth, this.wallHeight), wallMat);
        eastWall.position.set(this.roomWidth / 2, this.wallHeight / 2, 0);
        eastWall.rotation.y = -Math.PI / 2;
        eastWall.receiveShadow = true;
        this.roomGroup.add(eastWall);

        const westWall = new THREE.Mesh(new THREE.PlaneGeometry(this.roomDepth, this.wallHeight), wallMat);
        westWall.position.set(-this.roomWidth / 2, this.wallHeight / 2, 0);
        westWall.rotation.y = Math.PI / 2;
        westWall.receiveShadow = true;
        this.roomGroup.add(westWall);
    }

    // Living Room Props
    buildSofa(x, z) {
        const sofaGroup = new THREE.Group();
        sofaGroup.position.set(x, 0, z);
        const sofaMat = new THREE.MeshStandardMaterial({ color: 0x3d5a80, roughness: 0.7 });
        const base = new THREE.Mesh(new THREE.BoxGeometry(8.5, 0.8, 3.2), sofaMat);
        base.position.y = 0.65;
        base.castShadow = true;
        sofaGroup.add(base);

        const back = new THREE.Mesh(new THREE.BoxGeometry(8.5, 1.8, 0.7), sofaMat);
        back.position.set(0, 1.7, 1.35);
        back.castShadow = true;
        sofaGroup.add(back);

        const armL = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.4, 3.2), sofaMat);
        armL.position.set(-3.9, 1.3, 0);
        sofaGroup.add(armL);
        const armR = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.4, 3.2), sofaMat);
        armR.position.set(3.9, 1.3, 0);
        sofaGroup.add(armR);

        this.roomGroup.add(sofaGroup);
        this.addCollider(x, z, 8.8, 3.4);
    }

    buildCoffeeTable(x, z) {
        const tableGroup = new THREE.Group();
        tableGroup.position.set(x, 0, z);
        const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c3d2e, roughness: 0.35 });
        const top = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.2, 2.6), woodMat);
        top.position.y = 1.0;
        top.castShadow = true;
        tableGroup.add(top);

        const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.12, 0.22), new THREE.MeshStandardMaterial({ color: 0xffffff }));
        cup.position.set(0.6, 1.2, 0.2);
        tableGroup.add(cup);

        this.roomGroup.add(tableGroup);
        this.addCollider(x, z, 5.4, 2.8);
    }

    buildTVConsole(x, z) {
        const tvGroup = new THREE.Group();
        tvGroup.position.set(x, 0, z);
        const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c3d2e, roughness: 0.35 });
        const cab = new THREE.Mesh(new THREE.BoxGeometry(9, 1.3, 2), woodMat);
        cab.position.y = 0.65;
        tvGroup.add(cab);

        const frame = new THREE.Mesh(new THREE.BoxGeometry(8, 4.6, 0.2), new THREE.MeshStandardMaterial({ color: 0x111111 }));
        frame.position.set(0, 4.2, 0.2);
        tvGroup.add(frame);

        this.tvTexture = createTVCanvasTexture();
        const disp = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 4.2), new THREE.MeshBasicMaterial({ map: this.tvTexture }));
        disp.position.set(0, 4.2, 0.32);
        tvGroup.add(disp);

        this.roomGroup.add(tvGroup);
        this.addCollider(x, z, 9.4, 2.3);
    }

    buildBookshelf(x, z) {
        const shelf = new THREE.Mesh(new THREE.BoxGeometry(2, 6.5, 4.8), new THREE.MeshStandardMaterial({ color: 0x3d2817 }));
        shelf.position.set(x, 3.25, z);
        shelf.castShadow = true;
        this.roomGroup.add(shelf);
        this.addCollider(x, z, 2.4, 5.2);
    }

    buildCatTree(x, z) {
        const treeGroup = new THREE.Group();
        treeGroup.position.set(x, 0, z);
        const plush = new THREE.MeshStandardMaterial({ color: 0xf5cd79 });
        const base = new THREE.Mesh(new THREE.BoxGeometry(3, 0.2, 3), plush);
        base.position.y = 0.1;
        treeGroup.add(base);

        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 3.8), new THREE.MeshStandardMaterial({ color: 0xd2ba8a }));
        pole.position.y = 2.0;
        treeGroup.add(pole);

        const plat = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.2, 16), plush);
        plat.position.y = 2.4;
        treeGroup.add(plat);

        this.roomGroup.add(treeGroup);
        this.addCollider(x, z, 3.2, 3.2);
    }

    buildArmchair(x, z) {
        const chair = new THREE.Mesh(new THREE.BoxGeometry(3, 1.6, 3), new THREE.MeshStandardMaterial({ color: 0x3d5a80 }));
        chair.position.set(x, 0.8, z);
        chair.rotation.y = 0.6;
        chair.castShadow = true;
        this.roomGroup.add(chair);
        this.addCollider(x, z, 3.4, 3.4);
    }

    buildHousePlant(x, z) {
        const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.5, 1.4, 16), new THREE.MeshStandardMaterial({ color: 0xd35400 }));
        pot.position.set(x, 0.7, z);
        this.roomGroup.add(pot);
        this.addCollider(x, z, 1.8, 1.8);
    }

    buildFloorLamp(x, z) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 5.2), new THREE.MeshStandardMaterial({ color: 0xf39c12 }));
        pole.position.set(x, 2.6, z);
        this.roomGroup.add(pole);
        this.addCollider(x, z, 1.2, 1.2);
    }

    // Attic Props
    buildCardboardBoxStack(x, z) {
        const boxGroup = new THREE.Group();
        boxGroup.position.set(x, 0, z);
        const boxMat = new THREE.MeshStandardMaterial({ color: 0xcd853f, roughness: 0.85 });

        // Base box
        const b1 = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.8, 2.2), boxMat);
        b1.position.y = 0.9;
        b1.castShadow = true;
        boxGroup.add(b1);

        // Stacked second box angled
        const b2 = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.5, 1.8), boxMat);
        b2.position.set(0.1, 2.55, 0.1);
        b2.rotation.y = 0.3;
        b2.castShadow = true;
        boxGroup.add(b2);

        this.roomGroup.add(boxGroup);
        this.addCollider(x, z, 2.6, 2.4);
    }

    buildVintageTrunk(x, z, rotY) {
        const trunkGroup = new THREE.Group();
        trunkGroup.position.set(x, 0, z);
        trunkGroup.rotation.y = rotY;

        const woodMat = new THREE.MeshStandardMaterial({ color: 0x543d2b, roughness: 0.6 });
        const brassMat = new THREE.MeshStandardMaterial({ color: 0xf1c40f, metalness: 0.8 });

        const body = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.6, 2.2), woodMat);
        body.position.y = 0.8;
        body.castShadow = true;
        trunkGroup.add(body);

        // Curved lid
        const lid = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 3.6, 16, 1, false, 0, Math.PI), woodMat);
        lid.rotation.z = Math.PI / 2;
        lid.position.set(0, 1.6, 0);
        trunkGroup.add(lid);

        const lock = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 0.1), brassMat);
        lock.position.set(0, 1.2, 1.15);
        trunkGroup.add(lock);

        this.roomGroup.add(trunkGroup);
        this.addCollider(x, z, 3.8, 2.4);
    }

    buildRockingChair(x, z) {
        const chair = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.8, 2.6), new THREE.MeshStandardMaterial({ color: 0x6e4a2e, roughness: 0.7 }));
        chair.position.set(x, 1.4, z);
        chair.rotation.y = -0.4;
        chair.castShadow = true;
        this.roomGroup.add(chair);
        this.addCollider(x, z, 2.4, 2.8);
    }

    buildGrandfatherClock(x, z) {
        const clockGroup = new THREE.Group();
        clockGroup.position.set(x, 0, z);
        const woodMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.5 });
        const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 6.2, 1.4), woodMat);
        body.position.y = 3.1;
        body.castShadow = true;
        clockGroup.add(body);

        const face = new THREE.Mesh(new THREE.CircleGeometry(0.5, 16), new THREE.MeshStandardMaterial({ color: 0xfef9e7 }));
        face.position.set(0, 5.0, 0.72);
        clockGroup.add(face);

        this.roomGroup.add(clockGroup);
        this.addCollider(x, z, 2.0, 1.6);
    }

    buildStepLadder(x, z) {
        const ladder = new THREE.Mesh(new THREE.BoxGeometry(1.2, 4.5, 2.0), new THREE.MeshStandardMaterial({ color: 0x8d6e63 }));
        ladder.position.set(x, 2.25, z);
        ladder.rotation.z = 0.2;
        this.roomGroup.add(ladder);
        this.addCollider(x, z, 1.6, 2.2);
    }

    buildSuitcaseStack(x, z) {
        const suitGroup = new THREE.Group();
        suitGroup.position.set(x, 0, z);
        const s1 = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.8, 1.8), new THREE.MeshStandardMaterial({ color: 0x795548 }));
        s1.position.y = 0.4;
        suitGroup.add(s1);

        const s2 = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.7, 1.5), new THREE.MeshStandardMaterial({ color: 0x8d6e63 }));
        s2.position.set(0.1, 1.15, 0);
        s2.rotation.y = 0.15;
        suitGroup.add(s2);

        this.roomGroup.add(suitGroup);
        this.addCollider(x, z, 2.8, 2.0);
    }

    buildAtticLantern(x, y, z) {
        const lantern = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 0.8, 8), new THREE.MeshStandardMaterial({ color: 0xd4af37, emissive: 0xffa502, emissiveIntensity: 0.6 }));
        lantern.position.set(x, y, z);
        this.roomGroup.add(lantern);
    }

    // Basement Props
    buildFurnace(x, z) {
        const fGroup = new THREE.Group();
        fGroup.position.set(x, 0, z);
        const brickMat = new THREE.MeshStandardMaterial({ color: 0x3d3d3d, roughness: 0.9 });
        const body = new THREE.Mesh(new THREE.BoxGeometry(6.5, 4.5, 3.8), brickMat);
        body.position.y = 2.25;
        body.castShadow = true;
        fGroup.add(body);

        // Glowing Fire Pit Door
        const fireMat = new THREE.MeshBasicMaterial({ color: 0xff4500 });
        const fire = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.6, 0.2), fireMat);
        fire.position.set(0, 1.4, 1.95);
        fGroup.add(fire);

        // Chimney pipe going up
        const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 3.6), new THREE.MeshStandardMaterial({ color: 0x222222 }));
        pipe.position.set(0, 5.8, 0);
        fGroup.add(pipe);

        this.roomGroup.add(fGroup);
        this.addCollider(x, z, 6.8, 4.0);
    }

    buildBarrelStack(x, z) {
        const bGroup = new THREE.Group();
        bGroup.position.set(x, 0, z);
        const barrelMat = new THREE.MeshStandardMaterial({ color: 0x6d4c41, roughness: 0.6 });

        const b1 = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 2.6, 16), barrelMat);
        b1.position.set(-1.0, 1.3, 0);
        b1.castShadow = true;
        bGroup.add(b1);

        const b2 = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 2.6, 16), barrelMat);
        b2.position.set(1.0, 1.3, 0);
        b2.castShadow = true;
        bGroup.add(b2);

        const b3 = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 2.6, 16), barrelMat);
        b3.rotation.z = Math.PI / 2;
        b3.position.set(0, 3.2, 0);
        b3.castShadow = true;
        bGroup.add(b3);

        this.roomGroup.add(bGroup);
        this.addCollider(x, z, 4.4, 2.6);
    }

    buildWorkbench(x, z) {
        const bench = new THREE.Mesh(new THREE.BoxGeometry(6.2, 2.2, 2.8), new THREE.MeshStandardMaterial({ color: 0x4e342e, roughness: 0.7 }));
        bench.position.set(x, 1.1, z);
        bench.castShadow = true;
        this.roomGroup.add(bench);
        this.addCollider(x, z, 6.4, 3.0);
    }

    buildWashingMachine(x, z) {
        const washer = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.8, 2.4), new THREE.MeshStandardMaterial({ color: 0xdcdde1, roughness: 0.3, metalness: 0.4 }));
        washer.position.set(x, 1.4, z);
        washer.castShadow = true;
        this.roomGroup.add(washer);
        this.addCollider(x, z, 2.6, 2.6);
    }

    buildPalletWithCrates(x, z) {
        const crate = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.8, 2.8), new THREE.MeshStandardMaterial({ color: 0x8d6e63 }));
        crate.position.set(x, 0.9, z);
        this.roomGroup.add(crate);
        this.addCollider(x, z, 3.0, 3.0);
    }

    buildHangingBulb(x, y, z) {
        const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 2), new THREE.MeshBasicMaterial({ color: 0x111111 }));
        wire.position.set(x, y + 1, z);
        this.roomGroup.add(wire);

        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffeaa7 }));
        bulb.position.set(x, y, z);
        this.roomGroup.add(bulb);
    }

    // Kitchen Props
    buildKitchenCounter(x, z) {
        const cGroup = new THREE.Group();
        cGroup.position.set(x, 0, z);
        const cabinetMat = new THREE.MeshStandardMaterial({ color: 0x4a7c94, roughness: 0.6 });
        const body = new THREE.Mesh(new THREE.BoxGeometry(11.6, 2.6, 2.4), cabinetMat);
        body.position.y = 1.3;
        body.castShadow = true;
        cGroup.add(body);

        const top = new THREE.Mesh(new THREE.BoxGeometry(12, 0.25, 2.7), new THREE.MeshStandardMaterial({ color: 0xecf0f1, roughness: 0.25 }));
        top.position.y = 2.72;
        top.castShadow = true;
        cGroup.add(top);

        // Cabinet doors with round knobs
        const doorMat = new THREE.MeshStandardMaterial({ color: 0x5d9bb5, roughness: 0.55 });
        const knobMat = new THREE.MeshStandardMaterial({ color: 0xf1c40f, metalness: 0.7, roughness: 0.3 });
        for (let i = 0; i < 5; i++) {
            const doorX = -4.6 + i * 2.3;
            const door = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.0, 0.08), doorMat);
            door.position.set(doorX, 1.35, 1.22);
            cGroup.add(door);
            const knob = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), knobMat);
            knob.position.set(doorX + 0.7, 1.7, 1.3);
            cGroup.add(knob);
        }

        // Sink with tap
        const steelMat = new THREE.MeshStandardMaterial({ color: 0xbdc3c7, metalness: 0.8, roughness: 0.25 });
        const sink = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.1, 1.5), new THREE.MeshStandardMaterial({ color: 0x7f8c8d, metalness: 0.6, roughness: 0.3 }));
        sink.position.set(-2.5, 2.86, 0);
        cGroup.add(sink);
        const tap = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.0), steelMat);
        tap.position.set(-2.5, 3.35, -0.75);
        cGroup.add(tap);
        const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.6), steelMat);
        spout.rotation.x = Math.PI / 2;
        spout.position.set(-2.5, 3.8, -0.45);
        cGroup.add(spout);

        // Cutting board with a wedge of cheese (very tempting for mice!)
        const board = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 1.0), new THREE.MeshStandardMaterial({ color: 0xc8a165 }));
        board.position.set(2.5, 2.9, 0.1);
        cGroup.add(board);
        const cheese = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.35, 3), new THREE.MeshStandardMaterial({ color: 0xf9ca24, roughness: 0.6 }));
        cheese.position.set(2.5, 3.13, 0.1);
        cGroup.add(cheese);

        // Upper wall cabinets
        const upper = new THREE.Mesh(new THREE.BoxGeometry(11.6, 2.0, 1.2), cabinetMat);
        upper.position.set(0, 5.6, -0.6);
        upper.castShadow = true;
        cGroup.add(upper);

        this.roomGroup.add(cGroup);
        this.addCollider(x, z, 12.2, 2.9);
    }

    buildStove(x, z) {
        const sGroup = new THREE.Group();
        sGroup.position.set(x, 0, z);
        const body = new THREE.Mesh(new THREE.BoxGeometry(3.0, 2.7, 2.4), new THREE.MeshStandardMaterial({ color: 0xecf0f1, roughness: 0.3, metalness: 0.3 }));
        body.position.y = 1.35;
        body.castShadow = true;
        sGroup.add(body);

        // Oven window with a warm glow
        const ovenWin = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.1, 0.08), new THREE.MeshBasicMaterial({ color: 0xe67e22 }));
        ovenWin.position.set(0, 1.2, 1.22);
        sGroup.add(ovenWin);

        // Four glowing burners
        const burnerMat = new THREE.MeshBasicMaterial({ color: 0xff3f34 });
        [[-0.7, -0.5], [0.7, -0.5], [-0.7, 0.5], [0.7, 0.5]].forEach(([bx, bz]) => {
            const burner = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.07, 6, 16), burnerMat);
            burner.rotation.x = Math.PI / 2;
            burner.position.set(bx, 2.74, bz);
            sGroup.add(burner);
        });

        // Cooking pot on one burner
        const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.45, 0.7, 16), new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.4 }));
        pot.position.set(0.7, 3.1, 0.5);
        pot.castShadow = true;
        sGroup.add(pot);

        // Extractor hood
        const hood = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 1.6, 1.2, 4), new THREE.MeshStandardMaterial({ color: 0x95a5a6, metalness: 0.7, roughness: 0.3 }));
        hood.rotation.y = Math.PI / 4;
        hood.position.set(0, 5.6, -0.2);
        sGroup.add(hood);

        this.roomGroup.add(sGroup);
        this.addCollider(x, z, 3.2, 2.6);
    }

    buildFridge(x, z) {
        const fGroup = new THREE.Group();
        fGroup.position.set(x, 0, z);
        const fridgeMat = new THREE.MeshStandardMaterial({ color: 0xdfe6e9, roughness: 0.25, metalness: 0.4 });
        const body = new THREE.Mesh(new THREE.BoxGeometry(3.0, 6.4, 2.6), fridgeMat);
        body.position.y = 3.2;
        body.castShadow = true;
        fGroup.add(body);

        // Freezer/fridge door split and handles
        const gap = new THREE.Mesh(new THREE.BoxGeometry(3.02, 0.06, 0.05), new THREE.MeshBasicMaterial({ color: 0x636e72 }));
        gap.position.set(0, 4.4, 1.31);
        fGroup.add(gap);
        const handleMat = new THREE.MeshStandardMaterial({ color: 0x636e72, metalness: 0.8, roughness: 0.2 });
        const handleTop = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.2, 0.12), handleMat);
        handleTop.position.set(-1.2, 5.2, 1.4);
        fGroup.add(handleTop);
        const handleBottom = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.0, 0.12), handleMat);
        handleBottom.position.set(-1.2, 3.2, 1.4);
        fGroup.add(handleBottom);

        // Colorful fridge magnets
        const magnetColors = [0xff6b6b, 0x48dbfb, 0xfeca57, 0x1dd1a1];
        magnetColors.forEach((color, i) => {
            const magnet = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.06), new THREE.MeshStandardMaterial({ color: color }));
            magnet.position.set(-0.2 + (i % 2) * 0.7, 2.4 + Math.floor(i / 2) * 0.7, 1.32);
            magnet.rotation.z = (i - 1.5) * 0.2;
            fGroup.add(magnet);
        });

        this.roomGroup.add(fGroup);
        this.addCollider(x, z, 3.2, 2.8);
    }

    buildKitchenIsland(x, z) {
        const iGroup = new THREE.Group();
        iGroup.position.set(x, 0, z);
        const body = new THREE.Mesh(new THREE.BoxGeometry(6.4, 2.6, 2.6), new THREE.MeshStandardMaterial({ color: 0x8e5e3c, roughness: 0.6 }));
        body.position.y = 1.3;
        body.castShadow = true;
        iGroup.add(body);

        const top = new THREE.Mesh(new THREE.BoxGeometry(7.0, 0.25, 3.2), new THREE.MeshStandardMaterial({ color: 0x2d3436, roughness: 0.2, metalness: 0.2 }));
        top.position.y = 2.72;
        top.castShadow = true;
        iGroup.add(top);

        // Fruit bowl
        const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.7, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide }));
        bowl.position.set(-1.5, 3.55, 0);
        iGroup.add(bowl);
        const fruitColors = [0xe74c3c, 0xf39c12, 0x27ae60, 0xe74c3c];
        fruitColors.forEach((color, i) => {
            const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.25, 10, 10), new THREE.MeshStandardMaterial({ color: color, roughness: 0.4 }));
            fruit.position.set(-1.8 + (i % 2) * 0.55, 3.25 + Math.floor(i / 2) * 0.2, -0.2 + Math.floor(i / 2) * 0.35);
            iGroup.add(fruit);
        });

        // Three bar stools on the front side
        const stoolMat = new THREE.MeshStandardMaterial({ color: 0xd35400, roughness: 0.5 });
        const legMat = new THREE.MeshStandardMaterial({ color: 0x2d3436, metalness: 0.6 });
        for (let i = -1; i <= 1; i++) {
            const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.8), legMat);
            leg.position.set(i * 2.2, 0.9, 1.9);
            iGroup.add(leg);
            const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.18, 16), stoolMat);
            seat.position.set(i * 2.2, 1.85, 1.9);
            seat.castShadow = true;
            iGroup.add(seat);
        }

        this.roomGroup.add(iGroup);
        // Stools sit outside the island block, so the collider includes them
        this.addCollider(x, z + 0.4, 7.2, 4.0);
    }

    buildDiningTable(x, z) {
        const tGroup = new THREE.Group();
        tGroup.position.set(x, 0, z);
        const woodMat = new THREE.MeshStandardMaterial({ color: 0xa0522d, roughness: 0.5 });
        const top = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.2, 3.2), woodMat);
        top.position.y = 2.1;
        top.castShadow = true;
        tGroup.add(top);
        [[-2.2, -1.3], [2.2, -1.3], [-2.2, 1.3], [2.2, 1.3]].forEach(([lx, lz]) => {
            const leg = new THREE.Mesh(new THREE.BoxGeometry(0.25, 2.0, 0.25), woodMat);
            leg.position.set(lx, 1.0, lz);
            tGroup.add(leg);
        });

        // Red-and-white checked tablecloth runner
        const cloth = new THREE.Mesh(new THREE.BoxGeometry(5.1, 0.04, 1.2), new THREE.MeshStandardMaterial({ color: 0xff7675 }));
        cloth.position.y = 2.22;
        tGroup.add(cloth);

        // Four chairs around the table
        const chairMat = new THREE.MeshStandardMaterial({ color: 0xf5f6fa, roughness: 0.6 });
        [[-1.2, -2.3, 0], [1.2, -2.3, 0], [-1.2, 2.3, Math.PI], [1.2, 2.3, Math.PI]].forEach(([cx, cz, rot]) => {
            const chair = new THREE.Group();
            chair.position.set(cx, 0, cz);
            chair.rotation.y = rot;
            const seat = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.15, 1.2), chairMat);
            seat.position.y = 1.3;
            seat.castShadow = true;
            chair.add(seat);
            const back = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.5, 0.12), chairMat);
            back.position.set(0, 2.05, -0.55);
            chair.add(back);
            [[-0.55, -0.5], [0.55, -0.5], [-0.55, 0.5], [0.55, 0.5]].forEach(([lx, lz]) => {
                const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.3, 0.12), chairMat);
                leg.position.set(lx, 0.65, lz);
                chair.add(leg);
            });
            tGroup.add(chair);
        });

        this.roomGroup.add(tGroup);
        this.addCollider(x, z, 5.4, 6.0);
    }

    buildPantryShelf(x, z) {
        const pGroup = new THREE.Group();
        pGroup.position.set(x, 0, z);
        const woodMat = new THREE.MeshStandardMaterial({ color: 0x6d4c41, roughness: 0.7 });
        const frame = new THREE.Mesh(new THREE.BoxGeometry(1.8, 6.0, 4.6), woodMat);
        frame.position.y = 3.0;
        frame.castShadow = true;
        pGroup.add(frame);

        // Jars and cans on the shelves (facing into the room, +x)
        const itemColors = [0xe17055, 0xfdcb6e, 0x00b894, 0x0984e3, 0xd63031, 0xa29bfe];
        for (let shelf = 0; shelf < 3; shelf++) {
            for (let i = 0; i < 4; i++) {
                const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.8, 10), new THREE.MeshStandardMaterial({ color: itemColors[(shelf * 4 + i) % itemColors.length], roughness: 0.4 }));
                jar.position.set(0.95, 1.2 + shelf * 1.8, -1.6 + i * 1.05);
                pGroup.add(jar);
            }
        }

        this.roomGroup.add(pGroup);
        this.addCollider(x, z, 2.4, 4.8);
    }

    buildTrashBin(x, z) {
        const bin = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.65, 2.0, 16), new THREE.MeshStandardMaterial({ color: 0xb2bec3, metalness: 0.25, roughness: 0.35 }));
        bin.position.set(x, 1.0, z);
        bin.castShadow = true;
        this.roomGroup.add(bin);

        const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.12, 16), new THREE.MeshStandardMaterial({ color: 0x00b894, roughness: 0.4 }));
        lid.position.set(x, 2.06, z);
        this.roomGroup.add(lid);
        this.addCollider(x, z, 1.7, 1.7);
    }

    // Vincenzo's own food and water bowls (decoration, can be walked over)
    buildCatBowls(x, z) {
        const foodBowl = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.45, 0.3, 16), new THREE.MeshStandardMaterial({ color: 0xe84393, roughness: 0.4 }));
        foodBowl.position.set(x - 0.7, 0.15, z);
        this.roomGroup.add(foodBowl);
        const brokjesMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.8 });
        for (let i = 0; i < 8; i++) {
            const brokje = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), brokjesMat);
            brokje.position.set(x - 0.7 + (Math.random() - 0.5) * 0.6, 0.32, z + (Math.random() - 0.5) * 0.6);
            this.roomGroup.add(brokje);
        }

        const waterBowl = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.45, 0.3, 16), new THREE.MeshStandardMaterial({ color: 0x0984e3, roughness: 0.4 }));
        waterBowl.position.set(x + 0.7, 0.15, z);
        this.roomGroup.add(waterBowl);
        const water = new THREE.Mesh(new THREE.CircleGeometry(0.45, 16), new THREE.MeshStandardMaterial({ color: 0x74b9ff, roughness: 0.1, metalness: 0.3 }));
        water.rotation.x = -Math.PI / 2;
        water.position.set(x + 0.7, 0.29, z);
        this.roomGroup.add(water);
    }

    buildPendantLamp(x, y, z) {
        const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 8 - y), new THREE.MeshBasicMaterial({ color: 0x111111 }));
        cord.position.set(x, y + (8 - y) / 2, z);
        this.roomGroup.add(cord);

        const shade = new THREE.Mesh(new THREE.ConeGeometry(0.8, 0.7, 16, 1, true), new THREE.MeshStandardMaterial({ color: 0xe1b12c, roughness: 0.4, side: THREE.DoubleSide }));
        shade.position.set(x, y, z);
        this.roomGroup.add(shade);

        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), new THREE.MeshBasicMaterial({ color: 0xfff3c4 }));
        bulb.position.set(x, y - 0.3, z);
        this.roomGroup.add(bulb);
    }

    // Bedroom Props
    buildBed(x, z) {
        const bGroup = new THREE.Group();
        bGroup.position.set(x, 0, z);
        const woodMat = new THREE.MeshStandardMaterial({ color: 0x8d6e63, roughness: 0.6 });

        const frame = new THREE.Mesh(new THREE.BoxGeometry(5.6, 1.0, 8.0), woodMat);
        frame.position.y = 0.6;
        frame.castShadow = true;
        bGroup.add(frame);

        const mattress = new THREE.Mesh(new THREE.BoxGeometry(5.3, 0.6, 7.7), new THREE.MeshStandardMaterial({ color: 0xf5f6fa, roughness: 0.9 }));
        mattress.position.y = 1.4;
        bGroup.add(mattress);

        // Blanket covering the lower part of the bed, hanging over the sides
        const blanket = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.7, 5.2), new THREE.MeshStandardMaterial({ color: 0x0abde3, roughness: 0.8 }));
        blanket.position.set(0, 1.45, 1.3);
        blanket.castShadow = true;
        bGroup.add(blanket);
        const blanketStripe = new THREE.Mesh(new THREE.BoxGeometry(5.62, 0.72, 0.4), new THREE.MeshStandardMaterial({ color: 0xfeca57, roughness: 0.8 }));
        blanketStripe.position.set(0, 1.45, -0.9);
        bGroup.add(blanketStripe);

        // Pillow and a teddy bear
        const pillow = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.45, 1.3), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 }));
        pillow.position.set(0, 1.9, -3.0);
        bGroup.add(pillow);
        const bearMat = new THREE.MeshStandardMaterial({ color: 0xc8956d, roughness: 0.9 });
        const bearBody = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 10), bearMat);
        bearBody.position.set(1.5, 2.3, -1.6);
        bGroup.add(bearBody);
        const bearHead = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10), bearMat);
        bearHead.position.set(1.5, 2.95, -1.6);
        bGroup.add(bearHead);
        [-0.22, 0.22].forEach(ex => {
            const ear = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), bearMat);
            ear.position.set(1.5 + ex, 3.22, -1.6);
            bGroup.add(ear);
        });

        // Headboard against the wall
        const headboard = new THREE.Mesh(new THREE.BoxGeometry(5.8, 3.4, 0.3), woodMat);
        headboard.position.set(0, 1.7, -4.0);
        headboard.castShadow = true;
        bGroup.add(headboard);

        this.roomGroup.add(bGroup);
        this.addCollider(x, z, 5.8, 8.3);
    }

    buildNightstand(x, z) {
        const nGroup = new THREE.Group();
        nGroup.position.set(x, 0, z);
        const stand = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.8, 1.6), new THREE.MeshStandardMaterial({ color: 0xa1887f, roughness: 0.6 }));
        stand.position.y = 0.9;
        stand.castShadow = true;
        nGroup.add(stand);

        const knob = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), new THREE.MeshStandardMaterial({ color: 0xf1c40f, metalness: 0.6 }));
        knob.position.set(0, 1.2, 0.82);
        nGroup.add(knob);

        // Little bedside lamp with a glowing shade
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.25, 0.6, 12), new THREE.MeshStandardMaterial({ color: 0x2d3436 }));
        base.position.y = 2.1;
        nGroup.add(base);
        const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 0.6, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xffeaa7, side: THREE.DoubleSide }));
        shade.position.y = 2.6;
        nGroup.add(shade);

        this.roomGroup.add(nGroup);
        this.addCollider(x, z, 2.0, 1.8);
    }

    buildWardrobe(x, z) {
        const wGroup = new THREE.Group();
        wGroup.position.set(x, 0, z);
        const body = new THREE.Mesh(new THREE.BoxGeometry(4.4, 6.5, 2.0), new THREE.MeshStandardMaterial({ color: 0xdfe6e9, roughness: 0.5 }));
        body.position.y = 3.25;
        body.castShadow = true;
        wGroup.add(body);

        // Two doors with a gap in the middle and long handles
        const doorMat = new THREE.MeshStandardMaterial({ color: 0xf5f6fa, roughness: 0.45 });
        const handleMat = new THREE.MeshStandardMaterial({ color: 0x636e72, metalness: 0.7, roughness: 0.3 });
        [-1, 1].forEach(side => {
            const door = new THREE.Mesh(new THREE.BoxGeometry(2.05, 6.1, 0.08), doorMat);
            door.position.set(side * 1.07, 3.25, 1.02);
            wGroup.add(door);
            const handle = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.9, 0.1), handleMat);
            handle.position.set(side * 0.2, 3.4, 1.1);
            wGroup.add(handle);
        });

        // Boxes stored on top
        const boxMat = new THREE.MeshStandardMaterial({ color: 0xc8a165, roughness: 0.8 });
        const topBox = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.9, 1.4), boxMat);
        topBox.position.set(-0.9, 6.95, 0);
        wGroup.add(topBox);

        this.roomGroup.add(wGroup);
        this.addCollider(x, z, 4.6, 2.2);
    }

    buildDesk(x, z) {
        const dGroup = new THREE.Group();
        dGroup.position.set(x, 0, z);
        const woodMat = new THREE.MeshStandardMaterial({ color: 0xffeaa7, roughness: 0.6 });
        const top = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.18, 2.2), woodMat);
        top.position.y = 2.3;
        top.castShadow = true;
        dGroup.add(top);
        [[-2.1, -0.9], [2.1, -0.9], [-2.1, 0.9], [2.1, 0.9]].forEach(([lx, lz]) => {
            const leg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.3, 0.18), woodMat);
            leg.position.set(lx, 1.15, lz);
            dGroup.add(leg);
        });

        // Stack of school books, a pencil cup and a glowing laptop
        const bookColors = [0xe17055, 0x00b894, 0x0984e3];
        bookColors.forEach((color, i) => {
            const book = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.16, 0.75), new THREE.MeshStandardMaterial({ color: color }));
            book.position.set(-1.4, 2.48 + i * 0.16, 0);
            book.rotation.y = i * 0.15;
            dGroup.add(book);
        });
        const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.15, 0.4, 12), new THREE.MeshStandardMaterial({ color: 0xe84393 }));
        cup.position.set(1.7, 2.6, -0.5);
        dGroup.add(cup);
        const laptopBase = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.06, 1.0), new THREE.MeshStandardMaterial({ color: 0xb2bec3, metalness: 0.5, roughness: 0.3 }));
        laptopBase.position.set(0.3, 2.42, 0.1);
        dGroup.add(laptopBase);
        const screen = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.95, 0.05), new THREE.MeshBasicMaterial({ color: 0x74b9ff }));
        screen.position.set(0.3, 2.9, -0.4);
        screen.rotation.x = -0.2;
        dGroup.add(screen);

        // Desk chair in front
        const chairMat = new THREE.MeshStandardMaterial({ color: 0x6c5ce7, roughness: 0.5 });
        const seat = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.18, 1.3), chairMat);
        seat.position.set(0, 1.4, 1.9);
        seat.castShadow = true;
        dGroup.add(seat);
        const back = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 0.15), chairMat);
        back.position.set(0, 2.15, 2.5);
        dGroup.add(back);
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.3), new THREE.MeshStandardMaterial({ color: 0x2d3436, metalness: 0.6 }));
        post.position.set(0, 0.7, 1.9);
        dGroup.add(post);

        this.roomGroup.add(dGroup);
        // Desk and chair together
        this.addCollider(x, z + 0.7, 4.8, 3.8);
    }

    buildToyBox(x, z) {
        const tGroup = new THREE.Group();
        tGroup.position.set(x, 0, z);
        const box = new THREE.Mesh(new THREE.BoxGeometry(3.0, 1.6, 2.0), new THREE.MeshStandardMaterial({ color: 0xff6b6b, roughness: 0.6 }));
        box.position.y = 0.8;
        box.castShadow = true;
        tGroup.add(box);

        // Toys sticking out: a ball, a toy rocket and a block
        const ball = new THREE.Mesh(new THREE.SphereGeometry(0.4, 14, 12), new THREE.MeshStandardMaterial({ color: 0xfeca57, roughness: 0.4 }));
        ball.position.set(-0.7, 1.75, 0.1);
        tGroup.add(ball);
        const rocket = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1.1, 12), new THREE.MeshStandardMaterial({ color: 0xdfe6e9, roughness: 0.4 }));
        rocket.position.set(0.5, 1.9, -0.2);
        rocket.rotation.z = -0.3;
        tGroup.add(rocket);
        const block = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshStandardMaterial({ color: 0x1dd1a1 }));
        block.position.set(0.9, 1.75, 0.4);
        block.rotation.y = 0.5;
        tGroup.add(block);

        this.roomGroup.add(tGroup);
        this.addCollider(x, z, 3.2, 2.2);
    }

    buildBeanBag(x, z) {
        const bagGeo = new THREE.SphereGeometry(1.3, 18, 14);
        bagGeo.scale(1, 0.65, 1);
        const bag = new THREE.Mesh(bagGeo, new THREE.MeshStandardMaterial({ color: 0xff9f43, roughness: 0.85 }));
        bag.position.set(x, 0.75, z);
        bag.castShadow = true;
        this.roomGroup.add(bag);
        this.addCollider(x, z, 2.4, 2.4);
    }

    // Toy blocks scattered on the floor (decoration, can be walked over)
    buildToyBlocks(x, z) {
        const colors = [0xff6b6b, 0x48dbfb, 0xfeca57, 0x1dd1a1, 0xa29bfe];
        for (let i = 0; i < 7; i++) {
            const block = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.35), new THREE.MeshStandardMaterial({ color: colors[i % colors.length] }));
            const a = i * 2.4;
            block.position.set(x + Math.cos(a) * (0.4 + i * 0.15), 0.175, z + Math.sin(a) * (0.4 + i * 0.15));
            block.rotation.y = i * 0.7;
            this.roomGroup.add(block);
        }
    }
    // ---------- Shared helpers for the newer props ----------

    // A group at (x, 0, z) already added to the room
    propGroup(x, z) {
        const g = new THREE.Group();
        g.position.set(x, 0, z);
        this.roomGroup.add(g);
        return g;
    }

    // Collider for a prop turned by rotY (the box around the turned footprint)
    addRotatedCollider(x, z, w, d, rotY) {
        const c = Math.abs(Math.cos(rotY));
        const s = Math.abs(Math.sin(rotY));
        this.addCollider(x, z, w * c + d * s, w * s + d * c);
    }

    // ---------- Endless mode doors ----------

    /**
     * A point on a wall, moved `inset` units into the room, plus the rotation
     * that faces into the room (local +Z points away from the wall).
     */
    wallPoint(wall, at, inset) {
        const hw = this.roomWidth / 2;
        const hd = this.roomDepth / 2;
        switch (wall) {
            case 'north': return { x: at, z: -hd + inset, rotY: 0 };
            case 'south': return { x: at, z: hd - inset, rotY: Math.PI };
            case 'east':  return { x: hw - inset, z: at, rotY: -Math.PI / 2 };
            default:      return { x: -hw + inset, z: at, rotY: Math.PI / 2 }; // west
        }
    }

    /**
     * Adds doorways to other rooms of the house (endless mode).
     * @param {Array} doors - [{ wall: 'north'|'south'|'east'|'west', at, to, label }]
     */
    addDoors(doors) {
        const frameMat = std(0x8d6e63, { roughness: 0.5 });
        const darkMat = new THREE.MeshBasicMaterial({ color: 0x1a1208 });
        doors.forEach(door => {
            const { x, z, rotY } = this.wallPoint(door.wall, door.at, 0);
            const g = this.propGroup(x, z);
            g.rotation.y = rotY;

            const opening = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 4.2), darkMat);
            opening.position.set(0, 2.1, 0.04);
            g.add(opening);
            addMesh(g, new THREE.BoxGeometry(0.3, 4.5, 0.3), frameMat, -1.55, 2.25, 0.1);
            addMesh(g, new THREE.BoxGeometry(0.3, 4.5, 0.3), frameMat, 1.55, 2.25, 0.1);
            addMesh(g, new THREE.BoxGeometry(3.4, 0.3, 0.3), frameMat, 0, 4.5, 0.1);

            const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 0.7), new THREE.MeshBasicMaterial({ map: createDoorSignTexture(door.label) }));
            sign.position.set(0, 5.1, 0.14);
            g.add(sign);

            // Pulsing doormat with an arrow pointing at the door
            const matMat = new THREE.MeshBasicMaterial({ color: 0xffa502, transparent: true, opacity: 0.5, depthWrite: false });
            const doormat = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 1.8), matMat);
            doormat.rotation.x = -Math.PI / 2;
            doormat.position.set(0, 0.03, 1.0);
            g.add(doormat);
            const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.9, 3), new THREE.MeshBasicMaterial({ color: 0xffffff }));
            arrow.rotation.x = -Math.PI / 2;
            arrow.scale.z = 0.1;
            arrow.position.set(0, 0.06, 1.0);
            g.add(arrow);
            this.animate((dt, t) => { matMat.opacity = 0.35 + Math.sin(t * 4) * 0.2; });

            this.doors.push(door);
        });
    }

    // The door the cat is walking into at (x, z), or null
    doorAt(x, z) {
        const hw = this.roomWidth / 2;
        const hd = this.roomDepth / 2;
        for (const door of this.doors) {
            const along = (door.wall === 'north' || door.wall === 'south' ? x : z) - door.at;
            const fromWall = { north: z + hd, south: hd - z, east: hw - x, west: x + hw }[door.wall];
            if (Math.abs(along) < DOOR_HALF_WIDTH && fromWall < 1.0) return door;
        }
        return null;
    }

    // Where the cat appears when coming in through this door (facing into the room)
    doorEntry(door) {
        const p = this.wallPoint(door.wall, door.at, 2.6);
        return { x: p.x, z: p.z, rotY: p.rotY + Math.PI };
    }

    // ---------- Backyard Props ----------

    buildBigTree(x, z) {
        const g = this.propGroup(x, z);
        const bark = std(0x6d4c41, { roughness: 0.9 });
        const leaves = std(0x3f8f3a, { roughness: 0.85 });
        addMesh(g, new THREE.CylinderGeometry(0.55, 0.85, 5.6, 12), bark, 0, 2.8, 0);
        [[0, 6.6, 0, 3.0], [2.0, 5.8, 0.8, 2.2], [-1.9, 6.0, -0.6, 2.3], [0.4, 8.0, -0.4, 2.1], [-0.6, 5.6, 1.8, 1.9]].forEach(([cx, cy, cz, r]) => {
            addMesh(g, new THREE.SphereGeometry(r, 14, 12), leaves, cx, cy, cz);
        });
        const apple = std(0xd63031, { roughness: 0.4 });
        for (let i = 0; i < 10; i++) {
            const a = i * 2.39;
            addMesh(g, new THREE.SphereGeometry(0.18, 8, 8), apple, Math.cos(a) * 2.9, 5.6 + (i % 4) * 0.6, Math.sin(a) * 2.9);
        }
        // Branch with a tire swing
        const branch = addMesh(g, new THREE.BoxGeometry(3.4, 0.35, 0.35), bark, 1.9, 4.6, 0);
        branch.rotation.z = 0.1;
        const rope = std(0xd2b48c);
        [-0.3, 0.3].forEach(dz => addMesh(g, new THREE.CylinderGeometry(0.04, 0.04, 1.7), rope, 3.2, 3.8, dz));
        const swing = new THREE.Group();
        swing.position.set(3.2, 4.6, 0);
        g.add(swing);
        const tire = addMesh(swing, new THREE.TorusGeometry(0.55, 0.2, 10, 20), std(0x222222, { roughness: 0.8 }), 0, -2.2, 0);
        tire.rotation.y = Math.PI / 2;
        this.animate((dt, t) => { swing.rotation.x = Math.sin(t * 1.3) * 0.12; });
        this.addCollider(x, z, 2.0, 2.0);
    }

    buildGardenShed(x, z) {
        const g = this.propGroup(x, z);
        const wall = std(0xc0392b, { roughness: 0.75 });
        const trim = std(0xffffff, { roughness: 0.5 });
        addMesh(g, new THREE.BoxGeometry(6, 3.6, 4.4), wall, 0, 1.8, 0);
        addRoof(g, 6.6, 4.9, 3.6, 1.6, std(0x2d3436, { roughness: 0.8 }));
        // Double door, window and white trim
        addMesh(g, new THREE.BoxGeometry(2.2, 2.8, 0.1), std(0x8e2a1f, { roughness: 0.7 }), -0.9, 1.4, 2.22);
        addMesh(g, new THREE.BoxGeometry(0.08, 2.8, 0.12), trim, -0.9, 1.4, 2.25);
        addMesh(g, new THREE.BoxGeometry(1.2, 1.0, 0.1), std(0xbfe9ff, { roughness: 0.1, metalness: 0.3 }), 1.6, 2.2, 2.22);
        addMesh(g, new THREE.BoxGeometry(1.4, 0.12, 0.14), trim, 1.6, 1.65, 2.24);
        [-3, 3].forEach(cx => addMesh(g, new THREE.BoxGeometry(0.15, 3.6, 4.5), trim, cx, 1.8, 0));
        // Watering can by the door
        addMesh(g, new THREE.CylinderGeometry(0.3, 0.3, 0.6, 12), std(0x27ae60), 0.6, 0.3, 2.7);
        this.addCollider(x, z, 6.4, 4.8);
    }

    buildDoghouse(x, z) {
        const g = this.propGroup(x, z);
        addMesh(g, new THREE.BoxGeometry(2.4, 1.8, 2.6), std(0x3c6382, { roughness: 0.7 }), 0, 0.9, 0);
        addRoof(g, 2.9, 3.0, 1.8, 1.0, std(0xc0392b, { roughness: 0.7 }));
        const door = new THREE.Mesh(new THREE.CircleGeometry(0.6, 20), new THREE.MeshBasicMaterial({ color: 0x111111 }));
        door.position.set(0, 0.8, 1.31);
        g.add(door);
        // Sleeping dog in front (luckily it doesn't care about cats)
        const fur = std(0xb5651d, { roughness: 0.9 });
        const dark = std(0x5d3a1a, { roughness: 0.9 });
        const bodyGeo = new THREE.SphereGeometry(0.5, 14, 10);
        bodyGeo.scale(1.6, 0.7, 0.9);
        addMesh(g, bodyGeo, fur, 0.2, 0.35, 2.1);
        addMesh(g, new THREE.SphereGeometry(0.35, 12, 10), fur, -0.75, 0.4, 2.2);
        addMesh(g, new THREE.SphereGeometry(0.16, 8, 8), dark, -1.05, 0.33, 2.25);
        [-0.18, 0.18].forEach(dz => {
            const ear = addMesh(g, new THREE.BoxGeometry(0.15, 0.35, 0.22), dark, -0.65, 0.45, 2.2 + dz * 1.6);
            ear.rotation.x = dz * 2;
        });
        const tail = addMesh(g, new THREE.CylinderGeometry(0.05, 0.08, 0.6), fur, 1.05, 0.5, 2.1);
        this.animate((dt, t) => { tail.rotation.z = 0.8 + Math.sin(t * 6) * 0.3; });
        // Bone
        addMesh(g, new THREE.CylinderGeometry(0.05, 0.05, 0.4), std(0xffffff), 0.9, 0.05, 2.9).rotation.z = Math.PI / 2;
        this.addCollider(x, z + 0.6, 3.0, 3.9);
    }

    // Sandbox with a bucket and a sand castle (low enough to walk over)
    buildSandbox(x, z) {
        const g = this.propGroup(x, z);
        const wood = std(0xd4a373, { roughness: 0.8 });
        addMesh(g, new THREE.BoxGeometry(4.4, 0.4, 0.3), wood, 0, 0.2, -1.85);
        addMesh(g, new THREE.BoxGeometry(4.4, 0.4, 0.3), wood, 0, 0.2, 1.85);
        addMesh(g, new THREE.BoxGeometry(0.3, 0.4, 3.4), wood, -2.05, 0.2, 0);
        addMesh(g, new THREE.BoxGeometry(0.3, 0.4, 3.4), wood, 2.05, 0.2, 0);
        const sandMat = std(0xf6e58d, { roughness: 1 });
        const sand = addMesh(g, new THREE.BoxGeometry(3.8, 0.25, 3.4), sandMat, 0, 0.12, 0);
        sand.receiveShadow = true;
        addMesh(g, new THREE.CylinderGeometry(0.45, 0.5, 0.5, 12), sandMat, -0.8, 0.5, -0.4);
        [[-1.2, -0.8], [-0.4, -0.8], [-1.2, 0], [-0.4, 0]].forEach(([tx, tz]) => {
            addMesh(g, new THREE.CylinderGeometry(0.14, 0.14, 0.5, 8), sandMat, tx, 0.75, tz);
            addMesh(g, new THREE.ConeGeometry(0.16, 0.25, 8), std(0xe17055), tx, 1.1, tz);
        });
        addMesh(g, new THREE.CylinderGeometry(0.3, 0.22, 0.45, 12), std(0x0984e3), 1.1, 0.45, 0.6);
        const spade = addMesh(g, new THREE.BoxGeometry(0.08, 0.6, 0.25), std(0xfdcb6e), 1.3, 0.35, -0.6);
        spade.rotation.z = 0.6;
    }

    buildBarbecue(x, z) {
        const g = this.propGroup(x, z);
        const black = std(0x2d3436, { roughness: 0.4, metalness: 0.5 });
        for (let i = 0; i < 3; i++) {
            const a = (i / 3) * Math.PI * 2;
            const leg = addMesh(g, new THREE.CylinderGeometry(0.05, 0.05, 1.3), black, Math.cos(a) * 0.4, 0.6, Math.sin(a) * 0.4);
            leg.rotation.set(Math.sin(a) * 0.25, 0, -Math.cos(a) * 0.25);
        }
        addMesh(g, new THREE.SphereGeometry(0.6, 16, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), black, 0, 1.4, 0);
        const lid = addMesh(g, new THREE.SphereGeometry(0.6, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), black, 0, 1.45, -0.45);
        lid.rotation.x = -1.2;
        // Sausages and glowing coals
        addMesh(g, new THREE.CylinderGeometry(0.55, 0.55, 0.03, 16), new THREE.MeshBasicMaterial({ color: 0xff6b35 }), 0, 1.38, 0);
        [-0.2, 0, 0.2].forEach(sx => {
            addMesh(g, new THREE.CylinderGeometry(0.06, 0.06, 0.6, 8), std(0xa0522d), sx, 1.45, 0).rotation.x = Math.PI / 2;
        });
        this.addCollider(x, z, 1.6, 1.8);
    }

    buildFlowerBed(x, z) {
        const g = this.propGroup(x, z);
        addMesh(g, new THREE.BoxGeometry(6, 0.35, 1.5), std(0x5d4037, { roughness: 1 }), 0, 0.17, 0);
        const stem = std(0x2e7d32);
        const colors = [0xff6b81, 0xfeca57, 0xa29bfe, 0xff9f43, 0xffffff, 0xe84393];
        for (let i = 0; i < 14; i++) {
            const fx = -2.6 + (i % 7) * 0.87;
            const fz = i < 7 ? -0.35 : 0.35;
            const h = 0.6 + ((i * 7) % 5) * 0.12;
            addMesh(g, new THREE.CylinderGeometry(0.03, 0.03, h), stem, fx, 0.35 + h / 2, fz);
            addMesh(g, new THREE.SphereGeometry(0.17, 10, 8), std(colors[i % colors.length], { roughness: 0.5 }), fx, 0.35 + h, fz);
        }
        this.addCollider(x, z, 6.2, 1.7);
    }

    buildBirdBath(x, z) {
        const g = this.propGroup(x, z);
        const stone = std(0xbdc3c7, { roughness: 0.9 });
        addMesh(g, new THREE.CylinderGeometry(0.5, 0.7, 0.3, 14), stone, 0, 0.15, 0);
        addMesh(g, new THREE.CylinderGeometry(0.2, 0.25, 1.3, 12), stone, 0, 0.95, 0);
        addMesh(g, new THREE.CylinderGeometry(0.9, 0.5, 0.3, 18), stone, 0, 1.7, 0);
        const water = new THREE.Mesh(new THREE.CircleGeometry(0.8, 18), std(0x74b9ff, { roughness: 0.1, metalness: 0.3 }));
        water.rotation.x = -Math.PI / 2;
        water.position.y = 1.86;
        g.add(water);
        // A little blue bird hopping on the rim
        const bird = new THREE.Group();
        const blue = std(0x0984e3);
        addMesh(bird, new THREE.SphereGeometry(0.15, 10, 8), blue, 0, 0, 0);
        addMesh(bird, new THREE.SphereGeometry(0.1, 8, 8), blue, 0.12, 0.12, 0);
        const beak = addMesh(bird, new THREE.ConeGeometry(0.04, 0.1, 6), std(0xfdcb6e), 0.24, 0.12, 0);
        beak.rotation.z = -Math.PI / 2;
        bird.position.set(0.75, 2.0, 0);
        g.add(bird);
        this.animate((dt, t) => { bird.position.y = 2.0 + Math.max(0, Math.sin(t * 5)) * 0.15; });
        this.addCollider(x, z, 1.7, 1.7);
    }

    buildGardenGnome(x, z) {
        const g = this.propGroup(x, z);
        addMesh(g, new THREE.BoxGeometry(0.5, 0.2, 0.4), std(0x6d4c41), 0, 0.1, 0);
        addMesh(g, new THREE.ConeGeometry(0.38, 0.9, 14), std(0x0984e3), 0, 0.6, 0);
        addMesh(g, new THREE.SphereGeometry(0.23, 12, 10), std(0xffd1a4), 0, 1.15, 0);
        addMesh(g, new THREE.SphereGeometry(0.07, 8, 8), std(0xff7675), 0, 1.13, 0.23);
        const beard = addMesh(g, new THREE.ConeGeometry(0.2, 0.45, 12), std(0xffffff, { roughness: 0.9 }), 0, 0.88, 0.14);
        beard.rotation.x = Math.PI;
        addMesh(g, new THREE.ConeGeometry(0.26, 0.65, 14), std(0xd63031), 0, 1.58, 0);
        this.addCollider(x, z, 1.0, 1.0);
    }

    buildTrampoline(x, z) {
        const g = this.propGroup(x, z);
        const metal = std(0x636e72, { metalness: 0.6, roughness: 0.3 });
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2;
            addMesh(g, new THREE.CylinderGeometry(0.06, 0.06, 1.0), metal, Math.cos(a) * 2, 0.5, Math.sin(a) * 2);
        }
        const pad = addMesh(g, new THREE.TorusGeometry(2.05, 0.2, 8, 32), std(0x0abde3), 0, 1.0, 0);
        pad.rotation.x = Math.PI / 2;
        const mat = new THREE.Mesh(new THREE.CircleGeometry(1.9, 32), std(0x1e272e, { roughness: 0.9 }));
        mat.rotation.x = -Math.PI / 2;
        mat.position.y = 0.98;
        g.add(mat);
        // A bouncing ball someone left behind
        const ball = addMesh(g, new THREE.SphereGeometry(0.3, 14, 12), std(0xff4757, { roughness: 0.4 }), 0.6, 1.3, 0.3);
        this.animate((dt, t) => { ball.position.y = 1.3 + Math.abs(Math.sin(t * 3)) * 1.2; });
        this.addCollider(x, z, 4.4, 4.4);
    }

    // ---------- Abandoned Workshop Props ----------

    // Rusty old car up on cinder blocks, its wheels long gone
    buildOldCar(x, z) {
        const g = this.propGroup(x, z);
        const paint = std(0x4f8a8b, { roughness: 0.65, metalness: 0.3 });
        const rust = std(0xa0522d, { roughness: 0.95 });
        const glass = std(0x2c3e50, { roughness: 0.1, metalness: 0.5 });
        const chrome = std(0xdfe6e9, { metalness: 0.8, roughness: 0.2 });
        const block = std(0x95a5a6, { roughness: 0.95 });
        addMesh(g, new THREE.BoxGeometry(7.4, 1.3, 3.0), paint, 0, 1.25, 0);
        addMesh(g, new THREE.BoxGeometry(3.8, 1.0, 2.8), glass, -0.4, 2.4, 0);
        addMesh(g, new THREE.BoxGeometry(3.9, 0.15, 2.85), paint, -0.4, 2.95, 0);
        [-2.2, 1.4].forEach(px => addMesh(g, new THREE.BoxGeometry(0.15, 1.0, 2.85), paint, px, 2.4, 0));
        [-3.75, 3.75].forEach(bx => addMesh(g, new THREE.BoxGeometry(0.3, 0.4, 3.1), chrome, bx, 0.9, 0));
        [-1.0, 1.0].forEach(hz => {
            addMesh(g, new THREE.SphereGeometry(0.22, 10, 8), std(0xfff3b0, { emissive: 0x554400, emissiveIntensity: 0.4 }), 3.7, 1.45, hz);
        });
        [[-2.6, 1.51, 0.6, 0.5], [0.8, 1.51, 0.9, 0.4], [2.4, -1.51, 1.1, 0.6], [-1.5, -1.51, 0.7, 0.4]].forEach(([rx, rz, rw, rh]) => {
            addMesh(g, new THREE.BoxGeometry(rw, rh, 0.04), rust, rx, 1.1, rz);
        });
        [[-2.6, -1.1], [-2.6, 1.1], [2.6, -1.1], [2.6, 1.1]].forEach(([cx, cz]) => {
            addMesh(g, new THREE.BoxGeometry(0.8, 0.6, 0.8), block, cx, 0.3, cz);
        });
        const tire = addMesh(g, new THREE.TorusGeometry(0.55, 0.22, 10, 20), std(0x1e1e1e, { roughness: 0.9 }), -4.8, 0.22, 1.4);
        tire.rotation.x = Math.PI / 2;
        this.addCollider(x, z, 7.8, 3.4);
    }

    // Pegboard full of tools on the wall, with a red tool cabinet below
    buildToolWall(x, z) {
        const g = this.propGroup(x, z);
        addMesh(g, new THREE.BoxGeometry(6, 3, 0.1), std(0xc8a165, { roughness: 0.9 }), 0, 3.6, 0);
        const steel = std(0xb2bec3, { metalness: 0.7, roughness: 0.3 });
        const handle = std(0xd63031, { roughness: 0.5 });
        // Hammer, wrenches, saw and screwdrivers
        addMesh(g, new THREE.BoxGeometry(0.1, 1.0, 0.08), std(0x8d6e63), -2.3, 3.6, 0.1);
        addMesh(g, new THREE.BoxGeometry(0.45, 0.18, 0.12), steel, -2.3, 4.1, 0.1);
        [-1.4, -1.0].forEach((wx, i) => addMesh(g, new THREE.BoxGeometry(0.1, 1.0 - i * 0.2, 0.05), steel, wx, 3.7, 0.1));
        const saw = addMesh(g, new THREE.BoxGeometry(1.4, 0.45, 0.03), steel, 0.3, 4.3, 0.1);
        saw.rotation.z = 0.08;
        addMesh(g, new THREE.BoxGeometry(0.35, 0.4, 0.08), std(0x8d6e63), -0.55, 4.35, 0.1);
        [1.6, 1.85, 2.1, 2.35].forEach((sx, i) => {
            addMesh(g, new THREE.CylinderGeometry(0.06, 0.06, 0.3), [handle, std(0xfeca57), std(0x0984e3), handle][i], sx, 3.4, 0.12);
            addMesh(g, new THREE.CylinderGeometry(0.02, 0.02, 0.4), steel, sx, 3.05, 0.12);
        });
        const cabinet = std(0xc0392b, { roughness: 0.5, metalness: 0.3 });
        addMesh(g, new THREE.BoxGeometry(6, 1.6, 1.1), cabinet, 0, 0.8, 0.55);
        for (let d = 0; d < 3; d++) {
            addMesh(g, new THREE.BoxGeometry(5.8, 0.04, 0.02), std(0x1e1e1e), 0, 0.45 + d * 0.45, 1.11);
            addMesh(g, new THREE.BoxGeometry(0.6, 0.06, 0.06), steel, 0, 0.6 + d * 0.45, 1.13);
        }
        this.addCollider(x, z + 0.55, 6.2, 1.3);
    }

    buildTireStack(x, z) {
        const g = this.propGroup(x, z);
        const rubber = std(0x1e1e1e, { roughness: 0.95 });
        for (let i = 0; i < 4; i++) {
            const tire = addMesh(g, new THREE.TorusGeometry(0.62, 0.28, 10, 22), rubber, Math.sin(i * 2.1) * 0.12, 0.28 + i * 0.56, Math.cos(i * 2.1) * 0.12);
            tire.rotation.x = Math.PI / 2;
        }
        this.addCollider(x, z, 2.0, 2.0);
    }

    buildSawHorse(x, z) {
        const g = this.propGroup(x, z);
        const wood = std(0xc8a165, { roughness: 0.85 });
        addMesh(g, new THREE.BoxGeometry(3, 0.25, 0.35), wood, 0, 1.3, 0);
        [-1.2, 1.2].forEach(lx => [-1, 1].forEach(side => {
            const leg = addMesh(g, new THREE.BoxGeometry(0.15, 1.45, 0.15), wood, lx, 0.68, side * 0.3);
            leg.rotation.x = side * 0.35;
        }));
        const plank = addMesh(g, new THREE.BoxGeometry(3.6, 0.1, 0.8), std(0xe1b382, { roughness: 0.85 }), 0.2, 1.48, 0.1);
        plank.rotation.y = 0.15;
        this.addCollider(x, z, 3.4, 1.4);
    }

    buildOldGenerator(x, z) {
        const g = this.propGroup(x, z);
        addMesh(g, new THREE.BoxGeometry(2.8, 0.3, 2.0), std(0x2d3436), 0, 0.15, 0);
        addMesh(g, new THREE.BoxGeometry(2.2, 1.6, 1.6), std(0xe1b12c, { roughness: 0.7, metalness: 0.3 }), 0, 1.1, 0);
        const fly = addMesh(g, new THREE.TorusGeometry(0.6, 0.12, 8, 20), std(0x636e72, { metalness: 0.7, roughness: 0.3 }), 1.25, 1.1, 0);
        fly.rotation.y = Math.PI / 2;
        addMesh(g, new THREE.CylinderGeometry(0.12, 0.12, 1.4), std(0x7f8c8d, { metalness: 0.6 }), -0.7, 2.6, 0.3);
        [-0.5, 0.2].forEach(gx => {
            const dial = new THREE.Mesh(new THREE.CircleGeometry(0.2, 16), new THREE.MeshBasicMaterial({ color: 0xf5f6fa }));
            dial.position.set(gx, 1.3, 0.81);
            g.add(dial);
        });
        // Black-and-yellow warning stripes
        for (let i = 0; i < 5; i++) {
            const stripe = addMesh(g, new THREE.BoxGeometry(0.15, 0.6, 0.02), std(0x1e1e1e), -0.8 + i * 0.4, 0.6, 0.81);
            stripe.rotation.z = 0.6;
        }
        this.addCollider(x, z, 3.0, 2.2);
    }

    // ---------- Supermarket Props ----------

    // Shelf contents textures, made once per room and shared by all shelves
    productsMaterials() {
        if (!this.productsTexture) {
            this.productsTexture = [0, 1, 2].map(() => new THREE.MeshStandardMaterial({ map: createProductsTexture(), roughness: 0.6 }));
        }
        return this.productsTexture;
    }

    // Long double-sided shelf (aisle) running along X
    buildGroceryShelf(x, z) {
        const g = this.propGroup(x, z);
        const metal = std(0xdcdde1, { metalness: 0.4, roughness: 0.4 });
        addMesh(g, new THREE.BoxGeometry(9, 0.3, 1.6), metal, 0, 0.15, 0);
        addMesh(g, new THREE.BoxGeometry(9, 3.4, 0.1), metal, 0, 1.7, 0);
        addMesh(g, new THREE.BoxGeometry(9.2, 0.15, 1.7), std(0xe84118, { roughness: 0.5 }), 0, 3.45, 0);
        [-4.5, 4.5].forEach(ex => addMesh(g, new THREE.BoxGeometry(0.1, 3.4, 1.6), metal, ex, 1.7, 0));
        const products = this.productsMaterials();
        [0.35, 1.25, 2.15].forEach((h, i) => {
            addMesh(g, new THREE.BoxGeometry(9, 0.06, 1.6), metal, 0, h, 0);
            addMesh(g, new THREE.BoxGeometry(8.8, 0.7, 1.5), products[i], 0, h + 0.38, 0);
        });
        this.addCollider(x, z, 9.2, 1.8);
    }

    buildCheckout(x, z) {
        const g = this.propGroup(x, z);
        addMesh(g, new THREE.BoxGeometry(4.6, 1.1, 1.4), std(0x34495e, { roughness: 0.5 }), 0, 0.55, 0);
        addMesh(g, new THREE.BoxGeometry(3, 0.06, 1.0), std(0x111111, { roughness: 0.9 }), -0.8, 1.13, 0);
        addMesh(g, new THREE.BoxGeometry(0.8, 0.5, 0.6), std(0xdfe6e9), 1.6, 1.35, 0);
        addMesh(g, new THREE.BoxGeometry(0.6, 0.4, 0.05), std(0x2ed573, { emissive: 0x2ed573, emissiveIntensity: 0.6 }), 1.6, 1.85, 0.1);
        addMesh(g, new THREE.CylinderGeometry(0.06, 0.06, 2.2), std(0xb2bec3, { metalness: 0.6 }), 2.2, 2.2, -0.6);
        addMesh(g, new THREE.BoxGeometry(0.7, 0.5, 0.15), std(0xe84118, { emissive: 0xe84118, emissiveIntensity: 0.4 }), 2.2, 3.4, -0.6);
        // A few groceries on the belt
        addMesh(g, new THREE.BoxGeometry(0.4, 0.5, 0.3), std(0xfbc531), -1.6, 1.4, 0);
        addMesh(g, new THREE.CylinderGeometry(0.15, 0.15, 0.5, 10), std(0x00a8ff), -0.6, 1.4, 0.1);
        this.addCollider(x, z, 4.8, 1.6);
    }

    buildFreezer(x, z) {
        const g = this.propGroup(x, z);
        addMesh(g, new THREE.BoxGeometry(5, 1.3, 2), std(0xf5f6fa, { roughness: 0.4 }), 0, 0.65, 0);
        const tubColors = [0xff9ff3, 0xfeca57, 0x54a0ff, 0xffffff, 0x8b5a2b];
        for (let i = 0; i < 10; i++) {
            addMesh(g, new THREE.CylinderGeometry(0.25, 0.25, 0.3, 12), std(tubColors[i % tubColors.length]), -2 + (i % 5), 1.2, i < 5 ? -0.4 : 0.4);
        }
        addMesh(g, new THREE.BoxGeometry(4.8, 0.06, 1.8), std(0xc7ecee, { emissive: 0x81ecec, emissiveIntensity: 0.25, transparent: true, opacity: 0.45, roughness: 0.05 }), 0, 1.36, 0);
        this.addCollider(x, z, 5.2, 2.2);
    }

    buildFruitStand(x, z) {
        const g = this.propGroup(x, z);
        addMesh(g, new THREE.BoxGeometry(3, 0.9, 2.6), std(0x8d6e63, { roughness: 0.85 }), 0, 0.45, 0);
        const fruits = [0xff9f43, 0xd63031, 0xfeca57, 0x6ab04c];
        [[-0.7, -0.6], [0.7, -0.6], [-0.7, 0.6], [0.7, 0.6]].forEach(([cx, cz], i) => {
            const crate = new THREE.Group();
            crate.position.set(cx, 1.05, cz);
            crate.rotation.x = cz > 0 ? 0.25 : -0.05;
            addMesh(crate, new THREE.BoxGeometry(1.3, 0.3, 1.1), std(0xd4a373, { roughness: 0.9 }));
            for (let f = 0; f < 6; f++) {
                addMesh(crate, new THREE.SphereGeometry(0.2, 10, 8), std(fruits[i], { roughness: 0.5 }), -0.4 + (f % 3) * 0.4, 0.25, f < 3 ? -0.25 : 0.25);
            }
            g.add(crate);
        });
        this.addCollider(x, z, 3.2, 2.8);
    }

    // Tall dairy fridge with glowing glass doors (against a wall)
    buildDairyFridge(x, z) {
        const g = this.propGroup(x, z);
        addMesh(g, new THREE.BoxGeometry(12, 4.4, 1.6), std(0xf5f6fa, { roughness: 0.4 }), 0, 2.2, 0);
        addMesh(g, new THREE.BoxGeometry(12, 0.4, 1.7), std(0x0097e6, { emissive: 0x0097e6, emissiveIntensity: 0.3 }), 0, 4.6, 0);
        const milk = std(0xffffff, { roughness: 0.3 });
        const cap = std(0x0984e3);
        for (let shelf = 0; shelf < 3; shelf++) {
            for (let b = 0; b < 14; b++) {
                const bx = -5.4 + b * 0.83;
                addMesh(g, new THREE.CylinderGeometry(0.18, 0.18, 0.7, 10), (b + shelf) % 4 === 0 ? std(0xf9ca24) : milk, bx, 0.9 + shelf * 1.2, 0.5);
                addMesh(g, new THREE.CylinderGeometry(0.08, 0.08, 0.1, 8), cap, bx, 1.3 + shelf * 1.2, 0.5);
            }
        }
        const glass = std(0xc7ecee, { emissive: 0x7ed6df, emissiveIntensity: 0.3, transparent: true, opacity: 0.3, roughness: 0.05 });
        for (let d = 0; d < 5; d++) {
            addMesh(g, new THREE.BoxGeometry(2.25, 3.8, 0.05), glass, -4.8 + d * 2.4, 2.2, 0.82);
            addMesh(g, new THREE.BoxGeometry(0.06, 1.0, 0.08), std(0x636e72, { metalness: 0.6 }), -3.8 + d * 2.4, 2.2, 0.88);
        }
        this.addCollider(x, z, 12.2, 1.8);
    }

    // Round table piled with cheese wheels - the mice's favorite spot!
    buildCheeseDisplay(x, z) {
        const g = this.propGroup(x, z);
        addMesh(g, new THREE.CylinderGeometry(1.4, 1.4, 1.0, 20), std(0x8d6e63), 0, 0.5, 0);
        addMesh(g, new THREE.CylinderGeometry(1.5, 1.5, 0.05, 20), std(0xc0392b), 0, 1.02, 0);
        const cheese = std(0xf9ca24, { roughness: 0.5 });
        [[-0.5, 0, 0], [0.5, 0, 0.2], [0, 0, -0.6], [0, 1, -0.1]].forEach(([cx, layer, cz]) => {
            addMesh(g, new THREE.CylinderGeometry(0.5, 0.5, 0.35, 18), cheese, cx, 1.22 + layer * 0.36, cz);
        });
        addMesh(g, new THREE.CylinderGeometry(0.5, 0.5, 0.35, 18, 1, false, 0, Math.PI / 3), cheese, 0.6, 1.22, 0.85);
        addMesh(g, new THREE.CylinderGeometry(0.03, 0.03, 1.4), std(0x636e72), -1.0, 1.7, 0.6);
        const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.35), new THREE.MeshBasicMaterial({ map: createDoorSignTexture('🧀 SALE!'), side: THREE.DoubleSide }));
        sign.position.set(-1.0, 2.5, 0.6);
        g.add(sign);
        this.addCollider(x, z, 3.0, 3.0);
    }

    buildShoppingCart(x, z, rotY) {
        const g = this.propGroup(x, z);
        g.rotation.y = rotY;
        const wire = new THREE.MeshStandardMaterial({ color: 0xb2bec3, metalness: 0.6, roughness: 0.3, wireframe: true });
        addMesh(g, new THREE.BoxGeometry(1.2, 0.8, 1.8, 4, 3, 6), wire, 0, 1.2, 0);
        const frame = std(0x95a5a6, { metalness: 0.6, roughness: 0.3 });
        [-0.5, 0.5].forEach(fx => addMesh(g, new THREE.BoxGeometry(0.05, 0.05, 1.8), frame, fx, 0.35, 0));
        [-0.55, 0.55].forEach(fx => addMesh(g, new THREE.BoxGeometry(0.05, 1.0, 0.05), frame, fx, 1.3, 0.95));
        addMesh(g, new THREE.CylinderGeometry(0.05, 0.05, 1.2, 8), std(0xe84118), 0, 1.8, 0.95).rotation.z = Math.PI / 2;
        [[-0.5, -0.8], [0.5, -0.8], [-0.5, 0.8], [0.5, 0.8]].forEach(([wx, wz]) => {
            addMesh(g, new THREE.CylinderGeometry(0.1, 0.1, 0.06, 10), std(0x2d3436), wx, 0.1, wz).rotation.z = Math.PI / 2;
            addMesh(g, new THREE.BoxGeometry(0.04, 0.3, 0.04), frame, wx, 0.25, wz);
        });
        // Something in the basket
        addMesh(g, new THREE.BoxGeometry(0.5, 0.4, 0.4), std(0xfbc531), 0.1, 1.0, -0.3);
        this.addRotatedCollider(x, z, 1.4, 2.2, rotY);
    }

    buildCanPyramid(x, z) {
        const g = this.propGroup(x, z);
        const tin = std(0xd63031, { roughness: 0.35, metalness: 0.4 });
        const label = std(0xf5f6fa, { roughness: 0.5 });
        let layerY = 0.25;
        [3, 2, 1].forEach(n => {
            for (let i = 0; i < n; i++) {
                for (let j = 0; j < n; j++) {
                    const cx = (i - (n - 1) / 2) * 0.55;
                    const cz = (j - (n - 1) / 2) * 0.55;
                    addMesh(g, new THREE.CylinderGeometry(0.25, 0.25, 0.5, 12), tin, cx, layerY, cz);
                    addMesh(g, new THREE.CylinderGeometry(0.255, 0.255, 0.2, 12), label, cx, layerY, cz);
                }
            }
            layerY += 0.5;
        });
        this.addCollider(x, z, 2.0, 2.0);
    }

    // ---------- Boat Props ----------

    buildMast(x, z) {
        const g = this.propGroup(x, z);
        const wood = std(0x8d5524, { roughness: 0.8 });
        addMesh(g, new THREE.CylinderGeometry(0.3, 0.4, 16, 12), wood, 0, 8, 0);
        addMesh(g, new THREE.BoxGeometry(9.4, 0.3, 0.3), wood, 0, 12.6, 0);
        addMesh(g, new THREE.BoxGeometry(8.4, 0.25, 0.25), wood, 0, 5.4, 0);
        // Billowing sail
        const sailGeo = new THREE.PlaneGeometry(8.6, 7, 10, 8);
        const pos = sailGeo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            const u = (pos.getX(i) + 4.3) / 8.6;
            const v = (pos.getY(i) + 3.5) / 7;
            pos.setZ(i, Math.sin(u * Math.PI) * Math.sin(v * Math.PI) * 1.0);
        }
        sailGeo.computeVertexNormals();
        const sail = addMesh(g, sailGeo, std(0xf8efd4, { roughness: 0.9, side: THREE.DoubleSide }), 0, 9.0, 0.35);
        // Crow's nest and flag
        addMesh(g, new THREE.CylinderGeometry(0.9, 0.8, 0.8, 16, 1, true), std(0x6d3d14, { side: THREE.DoubleSide }), 0, 14.2, 0);
        const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.1), new THREE.MeshBasicMaterial({ map: createPawFlagTexture(), side: THREE.DoubleSide }));
        flag.geometry.translate(0.9, 0, 0);
        flag.position.set(0, 15.5, 0);
        g.add(flag);
        this.animate((dt, t) => {
            sail.scale.z = 1 + Math.sin(t * 1.4) * 0.25;
            flag.rotation.y = Math.sin(t * 2.5) * 0.35;
        });
        this.addCollider(x, z, 1.2, 1.2);
    }

    buildCaptainCabin(x, z) {
        const g = this.propGroup(x, z);
        const wood = std(0x8d5524, { roughness: 0.8 });
        addMesh(g, new THREE.BoxGeometry(10, 4, 4), wood, 0, 2, 0);
        addMesh(g, new THREE.BoxGeometry(10.6, 0.3, 4.6), std(0x4a2c10, { roughness: 0.8 }), 0, 4.15, 0);
        addMesh(g, new THREE.BoxGeometry(1.4, 2.6, 0.1), std(0x5d3a1a), 0, 1.3, 2.02);
        addMesh(g, new THREE.SphereGeometry(0.08, 8, 8), std(0xf1c40f, { metalness: 0.7 }), 0.5, 1.3, 2.1);
        [-3, 3].forEach(wx => {
            const win = new THREE.Mesh(new THREE.CircleGeometry(0.55, 18), std(0x74b9ff, { emissive: 0xffd28a, emissiveIntensity: 0.3 }));
            win.position.set(wx, 2.5, 2.02);
            g.add(win);
            const ring = addMesh(g, new THREE.TorusGeometry(0.58, 0.08, 8, 20), std(0xb8860b, { metalness: 0.7, roughness: 0.3 }), wx, 2.5, 2.03);
            ring.castShadow = false;
        });
        // Railing posts on the roof
        for (let px = -4.8; px <= 4.8; px += 1.2) addMesh(g, new THREE.CylinderGeometry(0.05, 0.05, 0.8), wood, px, 4.7, 2.1);
        addMesh(g, new THREE.BoxGeometry(10, 0.1, 0.1), wood, 0, 5.1, 2.1);
        this.addCollider(x, z, 10.2, 4.2);
    }

    buildShipWheel(x, z) {
        const g = this.propGroup(x, z);
        const wood = std(0x8d5524, { roughness: 0.7 });
        addMesh(g, new THREE.BoxGeometry(0.4, 1.6, 0.4), wood, 0, 0.8, 0);
        const wheel = new THREE.Group();
        wheel.position.set(0, 1.9, 0.3);
        g.add(wheel);
        addMesh(wheel, new THREE.TorusGeometry(0.8, 0.07, 8, 24), wood);
        addMesh(wheel, new THREE.CylinderGeometry(0.15, 0.15, 0.2, 12), std(0xb8860b, { metalness: 0.7 })).rotation.x = Math.PI / 2;
        for (let i = 0; i < 8; i++) {
            const spoke = addMesh(wheel, new THREE.BoxGeometry(0.06, 2.0, 0.06), wood);
            spoke.rotation.z = (i / 8) * Math.PI;
        }
        this.animate((dt, t) => { wheel.rotation.z = Math.sin(t * 0.5) * 0.6; });
        this.addCollider(x, z, 1.0, 1.0);
    }

    // rotY = 0 points the barrel to +X
    buildCannon(x, z, rotY) {
        const g = this.propGroup(x, z);
        g.rotation.y = rotY;
        const iron = std(0x2d3436, { roughness: 0.4, metalness: 0.6 });
        addMesh(g, new THREE.BoxGeometry(1.8, 0.6, 1.2), std(0x6d3d14, { roughness: 0.8 }), 0, 0.5, 0);
        [[-0.6, -0.65], [0.6, -0.65], [-0.6, 0.65], [0.6, 0.65]].forEach(([wx, wz]) => {
            addMesh(g, new THREE.CylinderGeometry(0.35, 0.35, 0.15, 14), std(0x4a2c10), wx, 0.35, wz).rotation.x = Math.PI / 2;
        });
        addMesh(g, new THREE.CylinderGeometry(0.28, 0.38, 2.6, 16), iron, 0.4, 1.05, 0).rotation.z = Math.PI / 2;
        addMesh(g, new THREE.TorusGeometry(0.3, 0.07, 8, 16), iron, 1.7, 1.05, 0).rotation.y = Math.PI / 2;
        [[-1.1, 0.25, 0.2], [-1.1, 0.25, -0.2], [-1.1, 0.55, 0]].forEach(([bx, by, bz]) => {
            addMesh(g, new THREE.SphereGeometry(0.2, 10, 8), iron, bx, by, bz);
        });
        this.addRotatedCollider(x, z, 3.2, 1.6, rotY);
    }

    buildRopeCoil(x, z) {
        const g = this.propGroup(x, z);
        const rope = std(0xd2b48c, { roughness: 0.95 });
        [0.55, 0.48, 0.4].forEach((r, i) => {
            addMesh(g, new THREE.TorusGeometry(r, 0.13, 8, 20), rope, 0, 0.13 + i * 0.25, 0).rotation.x = Math.PI / 2;
        });
        this.addCollider(x, z, 1.4, 1.4);
    }

    buildTreasureChest(x, z) {
        const g = this.propGroup(x, z);
        const wood = std(0x8d5524, { roughness: 0.75 });
        const gold = std(0xf1c40f, { metalness: 0.6, roughness: 0.3, emissive: 0x7a5c00, emissiveIntensity: 0.3 });
        addMesh(g, new THREE.BoxGeometry(2, 1, 1.3), wood, 0, 0.5, 0);
        addMesh(g, new THREE.CylinderGeometry(0.65, 0.65, 2, 16), wood, 0, 1.0, 0).rotation.z = Math.PI / 2;
        [-0.8, 0.8].forEach(bx => addMesh(g, new THREE.BoxGeometry(0.12, 1.75, 1.36), gold, bx, 0.85, 0));
        addMesh(g, new THREE.BoxGeometry(0.3, 0.35, 0.1), gold, 0, 0.95, 0.68);
        for (let i = 0; i < 9; i++) {
            const coin = addMesh(g, new THREE.CylinderGeometry(0.13, 0.13, 0.04, 12), gold, -0.6 + (i % 5) * 0.32, 0.03 + Math.floor(i / 5) * 0.05, 0.95 + (i % 3) * 0.18);
            coin.rotation.x = (i % 3) * 0.2;
        }
        this.addCollider(x, z, 2.2, 1.5);
    }

    buildAnchor(x, z) {
        const g = this.propGroup(x, z);
        const iron = std(0x2d3436, { roughness: 0.4, metalness: 0.6 });
        addMesh(g, new THREE.BoxGeometry(0.3, 0.25, 2.4), iron, 0, 0.15, 0);
        addMesh(g, new THREE.TorusGeometry(0.25, 0.07, 8, 16), iron, 0, 0.12, -1.4).rotation.x = Math.PI / 2;
        addMesh(g, new THREE.BoxGeometry(1.6, 0.2, 0.2), iron, 0, 0.15, -0.9);
        const arms = addMesh(g, new THREE.TorusGeometry(0.9, 0.13, 8, 20, Math.PI), iron, 0, 0.15, 0.3);
        arms.rotation.x = -Math.PI / 2;
        arms.rotation.z = Math.PI;
        [-0.9, 0.9].forEach(fx => {
            const fluke = addMesh(g, new THREE.ConeGeometry(0.22, 0.5, 4), iron, fx, 0.15, 0.1);
            fluke.rotation.x = -Math.PI / 2;
        });
        this.addCollider(x, z, 2.2, 3.0);
    }

    // ---------- Spaceship Props ----------

    buildControlConsole(x, z) {
        const g = this.propGroup(x, z);
        const hull = std(0xdfe4ea, { roughness: 0.4, metalness: 0.3 });
        addMesh(g, new THREE.BoxGeometry(3.2, 1.2, 1.6), hull, 0, 0.6, 0);
        [-1, 1].forEach(side => {
            const wing = addMesh(g, new THREE.BoxGeometry(2.6, 1.2, 1.6), hull, side * 2.75, 0.6, 0.55);
            wing.rotation.y = -side * 0.45;
        });
        const panel = addMesh(g, new THREE.BoxGeometry(3.0, 0.1, 1.2), std(0x2f3542), 0, 1.25, 0.1);
        panel.rotation.x = 0.35;
        // Blinking buttons
        const blink = std(0xff4757, { emissive: 0xff4757, emissiveIntensity: 1 });
        const buttonColors = [0x2ed573, 0x1e90ff, 0xffa502];
        for (let i = 0; i < 12; i++) {
            const mat = i % 4 === 0 ? blink : std(buttonColors[i % 3], { emissive: buttonColors[i % 3], emissiveIntensity: 0.6 });
            addMesh(g, new THREE.BoxGeometry(0.18, 0.08, 0.18), mat, -1.2 + (i % 6) * 0.48, 1.33, i < 6 ? -0.15 : 0.3);
        }
        this.animate((dt, t) => { blink.emissiveIntensity = Math.sin(t * 6) > 0 ? 1 : 0.1; });
        // Big view screen above
        const screen = new THREE.Mesh(new THREE.PlaneGeometry(6, 2.6), new THREE.MeshBasicMaterial({ map: createStarfieldTexture() }));
        screen.position.set(0, 3.6, -1.1);
        g.add(screen);
        addMesh(g, new THREE.BoxGeometry(6.3, 2.9, 0.1), std(0x57606f, { metalness: 0.6 }), 0, 3.6, -1.18);
        this.addCollider(x, z + 0.3, 8.4, 2.6);
    }

    buildCryoPod(x, z) {
        const g = this.propGroup(x, z);
        const metal = std(0xa4b0be, { metalness: 0.7, roughness: 0.3 });
        addMesh(g, new THREE.CylinderGeometry(0.95, 1.0, 0.4, 20), metal, 0, 0.2, 0);
        addMesh(g, new THREE.CylinderGeometry(0.95, 0.95, 0.3, 20), metal, 0, 3.0, 0);
        // A sleeping space mouse inside!
        const mouseBody = new THREE.SphereGeometry(0.3, 12, 10);
        mouseBody.scale(0.8, 0.7, 1.3);
        addMesh(g, mouseBody, std(0x7f8c8d), 0, 1.5, 0);
        const glass = std(0x81ecec, { emissive: 0x00d2d3, emissiveIntensity: 0.4, transparent: true, opacity: 0.35, roughness: 0.05 });
        const tube = addMesh(g, new THREE.CylinderGeometry(0.8, 0.8, 2.5, 20, 1, true), glass, 0, 1.65, 0);
        tube.castShadow = false;
        this.animate((dt, t) => { glass.emissiveIntensity = 0.3 + Math.sin(t * 2 + x) * 0.15; });
        this.addCollider(x, z, 2.1, 2.1);
    }

    buildReactorCore(x, z) {
        const g = this.propGroup(x, z);
        const metal = std(0x57606f, { metalness: 0.7, roughness: 0.3 });
        addMesh(g, new THREE.CylinderGeometry(1.5, 1.6, 0.5, 24), metal, 0, 0.25, 0);
        addMesh(g, new THREE.CylinderGeometry(1.3, 1.3, 0.4, 24), metal, 0, 5.4, 0);
        const core = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 4.9, 20), new THREE.MeshBasicMaterial({ color: 0x00d2d3 }));
        core.position.y = 2.85;
        g.add(core);
        const glass = new THREE.Mesh(
            new THREE.CylinderGeometry(0.95, 0.95, 4.9, 24, 1, true),
            new THREE.MeshStandardMaterial({ color: 0x81ecec, transparent: true, opacity: 0.25, roughness: 0.05, side: THREE.DoubleSide })
        );
        glass.position.y = 2.85;
        g.add(glass);
        const ringMat = std(0xffa502, { metalness: 0.6, roughness: 0.3, emissive: 0xff7f00, emissiveIntensity: 0.4 });
        const rings = [1.5, 2.9, 4.3].map(ry => {
            const ring = addMesh(g, new THREE.TorusGeometry(1.3, 0.08, 8, 32), ringMat, 0, ry, 0);
            ring.rotation.x = Math.PI / 2;
            return ring;
        });
        this.animate((dt, t) => {
            rings.forEach((ring, i) => {
                ring.rotation.x = Math.PI / 2 + Math.sin(t * (1 + i * 0.4)) * 0.3;
                ring.rotation.y = Math.cos(t * (1.2 + i * 0.3)) * 0.3;
            });
            core.material.color.setHSL(0.5, 1, 0.4 + Math.sin(t * 3) * 0.1);
        });
        this.addCollider(x, z, 3.2, 3.2);
    }

    // Cargo crate drifting in zero gravity
    buildFloatingCrate(x, y, z) {
        const g = this.propGroup(x, z);
        const crate = new THREE.Group();
        g.add(crate);
        addMesh(crate, new THREE.BoxGeometry(1.4, 1.4, 1.4), std(0x95a5a6, { metalness: 0.4, roughness: 0.5 }));
        addMesh(crate, new THREE.BoxGeometry(1.42, 0.3, 1.42), std(0xffa502, { roughness: 0.5 }));
        const phase = x * 0.7 + z * 0.3;
        this.animate((dt, t) => {
            crate.position.y = y + Math.sin(t * 0.8 + phase) * 0.4;
            crate.rotation.set(Math.sin(t * 0.3 + phase) * 0.5, t * 0.2 + phase, Math.cos(t * 0.25 + phase) * 0.4);
        });
        this.addCollider(x, z, 1.7, 1.7);
    }

    buildSpaceRobot(x, z) {
        const g = this.propGroup(x, z);
        const white = std(0xf5f6fa, { roughness: 0.35, metalness: 0.2 });
        addMesh(g, new THREE.BoxGeometry(1.0, 0.4, 1.2), std(0x2f3542), 0, 0.2, 0);
        addMesh(g, new THREE.BoxGeometry(1.0, 1.1, 0.8), white, 0, 0.95, 0);
        [-1, 1].forEach(side => {
            const arm = addMesh(g, new THREE.CylinderGeometry(0.1, 0.1, 0.9), white, side * 0.62, 1.0, 0.1);
            arm.rotation.x = -0.5;
        });
        const head = new THREE.Group();
        head.position.y = 1.85;
        g.add(head);
        addMesh(head, new THREE.SphereGeometry(0.4, 16, 12), white);
        addMesh(head, new THREE.BoxGeometry(0.6, 0.16, 0.1), std(0x00d2d3, { emissive: 0x00d2d3, emissiveIntensity: 0.8 }), 0, 0.05, 0.36);
        addMesh(head, new THREE.CylinderGeometry(0.02, 0.02, 0.4), std(0x636e72), 0, 0.55, 0);
        const bulb = std(0xff4757, { emissive: 0xff4757, emissiveIntensity: 1 });
        addMesh(head, new THREE.SphereGeometry(0.07, 8, 8), bulb, 0, 0.78, 0);
        this.animate((dt, t) => {
            head.rotation.y = Math.sin(t * 0.9) * 0.8;
            bulb.emissiveIntensity = Math.sin(t * 5) > 0 ? 1 : 0.1;
        });
        this.addCollider(x, z, 1.4, 1.4);
    }

    buildPlantPod(x, z) {
        const g = this.propGroup(x, z);
        addMesh(g, new THREE.BoxGeometry(3, 0.8, 1.6), std(0xf5f6fa, { roughness: 0.4 }), 0, 0.4, 0);
        addMesh(g, new THREE.BoxGeometry(2.8, 0.1, 1.4), std(0x3d2b1f, { roughness: 1 }), 0, 0.85, 0);
        const leaf = std(0x2ed573, { roughness: 0.7 });
        for (let i = 0; i < 8; i++) {
            const px = -1.1 + (i % 4) * 0.73;
            const pz = i < 4 ? -0.35 : 0.35;
            addMesh(g, i % 2 ? new THREE.SphereGeometry(0.28, 10, 8) : new THREE.ConeGeometry(0.22, 0.7, 8), leaf, px, 1.2, pz);
        }
        [-1.4, 1.4].forEach(px => addMesh(g, new THREE.CylinderGeometry(0.04, 0.04, 1.6), std(0xa4b0be), px, 1.6, 0));
        addMesh(g, new THREE.BoxGeometry(3, 0.12, 0.3), std(0xe056fd, { emissive: 0xe056fd, emissiveIntensity: 0.9 }), 0, 2.4, 0);
        this.addCollider(x, z, 3.2, 1.8);
    }

    buildSpaceSuitRack(x, z) {
        const g = this.propGroup(x, z);
        const suit = std(0xf5f6fa, { roughness: 0.6 });
        addMesh(g, new THREE.CylinderGeometry(0.7, 0.7, 0.15, 16), std(0x57606f, { metalness: 0.6 }), 0, 0.08, 0);
        [-0.22, 0.22].forEach(lx => addMesh(g, new THREE.CylinderGeometry(0.17, 0.17, 1.2), suit, lx, 0.75, 0));
        addMesh(g, new THREE.BoxGeometry(0.9, 1.1, 0.5), suit, 0, 1.9, 0);
        addMesh(g, new THREE.BoxGeometry(0.8, 0.9, 0.3), std(0xa4b0be), 0, 1.95, -0.4);
        [-1, 1].forEach(side => {
            const arm = addMesh(g, new THREE.CylinderGeometry(0.14, 0.14, 1.0), suit, side * 0.6, 1.85, 0);
            arm.rotation.z = side * 0.25;
        });
        addMesh(g, new THREE.SphereGeometry(0.4, 16, 12), suit, 0, 2.8, 0);
        const visor = new THREE.SphereGeometry(0.3, 16, 12);
        visor.scale(1, 0.8, 0.6);
        addMesh(g, visor, std(0xf1c40f, { metalness: 0.9, roughness: 0.1 }), 0, 2.82, 0.2);
        addMesh(g, new THREE.BoxGeometry(0.25, 0.15, 0.02), std(0x0984e3), 0.25, 2.2, 0.26);
        this.addCollider(x, z, 1.6, 1.4);
    }
}
