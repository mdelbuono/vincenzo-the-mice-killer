import * as THREE from 'three';
import {
    createParquetTexture, createAtticFloorTexture, createBasementFloorTexture,
    createBasementWallTexture, createKitchenFloorTexture, createKitchenWallTexture,
    createCarpetTexture, createBedroomWallTexture,
    createRugTexture, createTVCanvasTexture
} from './textures.js';

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
        this.wallHeight = 8;
        this.tvTexture = null;
        this.currentLevel = 1;
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
    }

    /**
     * Builds the level by fetching the environment JSON file referenced in the
     * level config. Falls back to the legacy hardcoded build methods if no
     * environment file is specified or if the fetch fails.
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
                console.warn(`Could not load environment file "${environmentFile}", falling back to built-in builder:`, err);
            }
        }
    }

    /**
     * Builds the environment from a parsed environment JSON data object.
     * @param {object} envData
     */
    _buildFromData(envData) {
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
}
