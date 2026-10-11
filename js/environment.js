// --- Dynamic Multi-Level Room Environment Builder ---
class LevelEnvironment {
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

    buildLevel(lvl) {
        this.clearCurrentLevel();
        this.currentLevel = lvl;

        if (lvl === 1) {
            this.buildLivingRoom();
        } else if (lvl === 2) {
            this.buildAttic();
        } else if (lvl === 3) {
            this.buildBasement();
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

    // ================= LEVEL 1: THE LIVING ROOM =================
    buildLivingRoom() {
        // Lighting
        const ambient = new THREE.AmbientLight(0xfff5eb, 0.6);
        this.lightsGroup.add(ambient);

        const sunLight = new THREE.DirectionalLight(0xfffaed, 0.95);
        sunLight.position.set(16, 12, 4);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 2048;
        sunLight.shadow.mapSize.height = 2048;
        const d = 16;
        sunLight.shadow.camera.left = -d;
        sunLight.shadow.camera.right = d;
        sunLight.shadow.camera.top = d;
        sunLight.shadow.camera.bottom = -d;
        this.lightsGroup.add(sunLight);

        const ceilingLight = new THREE.PointLight(0xffe8d6, 0.6, 25);
        ceilingLight.position.set(0, 7.5, 0);
        this.lightsGroup.add(ceilingLight);

        // Floor & Ceiling
        const floorMat = new THREE.MeshStandardMaterial({ map: createParquetTexture(), roughness: 0.4 });
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(this.roomWidth, this.roomDepth), floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.roomGroup.add(floor);

        const ceilMat = new THREE.MeshStandardMaterial({ color: 0xf5f6fa, roughness: 0.9 });
        const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(this.roomWidth, this.roomDepth), ceilMat);
        ceiling.position.y = this.wallHeight;
        ceiling.rotation.x = Math.PI / 2;
        this.roomGroup.add(ceiling);

        // Walls
        const wallMat = new THREE.MeshStandardMaterial({ color: 0xecf0f1, roughness: 0.7 });
        this.createRoomWalls(wallMat);

        // Center Area Rug
        const rugMat = new THREE.MeshStandardMaterial({ map: createRugTexture(), roughness: 0.85 });
        const rug = new THREE.Mesh(new THREE.PlaneGeometry(14, 10), rugMat);
        rug.rotation.x = -Math.PI / 2;
        rug.position.set(0, 0.02, 0);
        rug.receiveShadow = true;
        this.roomGroup.add(rug);

        // Sofa
        this.buildSofa(0, 4.5);
        // Coffee table
        this.buildCoffeeTable(0, 0);
        // TV Console
        this.buildTVConsole(0, -11.2);
        // Bookshelf
        this.buildBookshelf(-15, -4);
        // Cat Tree
        this.buildCatTree(13.5, -7);
        // Armchair
        this.buildArmchair(-8.5, 5.5);
        // Potted plant & Lamp
        this.buildHousePlant(-15, 11);
        this.buildFloorLamp(14.5, 7);
    }

    // ================= LEVEL 2: THE ATTIC =================
    buildAttic() {
        // Lighting: Moonlight from gable window + amber antique lantern
        const ambient = new THREE.AmbientLight(0x708090, 0.4);
        this.lightsGroup.add(ambient);

        // Cool Moonbeam through attic gable
        const moonLight = new THREE.DirectionalLight(0xa4b0be, 0.7);
        moonLight.position.set(-16, 14, -6);
        moonLight.castShadow = true;
        this.lightsGroup.add(moonLight);

        // Warm Lantern in center
        const lanternLight = new THREE.PointLight(0xff9f43, 0.9, 18);
        lanternLight.position.set(0, 4.5, 0);
        this.lightsGroup.add(lanternLight);

        // Floor & Roof Rafters
        const floorMat = new THREE.MeshStandardMaterial({ map: createAtticFloorTexture(), roughness: 0.65 });
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(this.roomWidth, this.roomDepth), floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.roomGroup.add(floor);

        // Aged Wood Walls
        const wallMat = new THREE.MeshStandardMaterial({ color: 0x5c4d41, roughness: 0.85 });
        this.createRoomWalls(wallMat);

        // Slanted Attic Wooden Rafters / Ceiling Beams
        const beamMat = new THREE.MeshStandardMaterial({ color: 0x3d2f26, roughness: 0.8 });
        for (let z = -11; z <= 11; z += 5.5) {
            // A-Frame Rafter
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

        // Circular Gable Window showing Moonlight
        const winMat = new THREE.MeshBasicMaterial({ color: 0x48dbfb });
        const winMesh = new THREE.Mesh(new THREE.CircleGeometry(2.2, 16), winMat);
        winMesh.position.set(0, 5.2, -this.roomDepth / 2 + 0.1);
        this.roomGroup.add(winMesh);

        // Attic Props:
        // 1. Stacked Moving Boxes (Cardboard)
        this.buildCardboardBoxStack(4, 3);
        this.buildCardboardBoxStack(-5, -6);
        this.buildCardboardBoxStack(10, -5);

        // 2. Vintage Wooden Trunks / Chests
        this.buildVintageTrunk(-9, 4, 0.3);
        this.buildVintageTrunk(7, -8, -0.2);

        // 3. Antique Rocking Chair
        this.buildRockingChair(-1, -3);

        // 4. Grandfather Clock
        this.buildGrandfatherClock(13.5, 4);

        // 5. Old Step Ladder
        this.buildStepLadder(-13, 0);

        // 6. Stacked Vintage Suitcases
        this.buildSuitcaseStack(-12, 7);

        // 7. Hanging Brass Lantern in Center
        this.buildAtticLantern(0, 4.5, 0);
    }

    // ================= LEVEL 3: THE BASEMENT =================
    buildBasement() {
        // Lighting: Dim, moody stone cellar + glowing furnace fire pit
        const ambient = new THREE.AmbientLight(0x2f3640, 0.35);
        this.lightsGroup.add(ambient);

        // Glowing Fire Embers from Furnace
        const furnaceLight = new THREE.PointLight(0xff5722, 1.3, 20);
        furnaceLight.position.set(0, 2.2, -10.5);
        this.lightsGroup.add(furnaceLight);

        // Work Light in workbench corner
        const workLight = new THREE.PointLight(0xffeaa7, 0.8, 16);
        workLight.position.set(-11, 4.5, 4);
        this.lightsGroup.add(workLight);

        // Floor & Walls
        const floorMat = new THREE.MeshStandardMaterial({ map: createBasementFloorTexture(), roughness: 0.5, metalness: 0.2 });
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(this.roomWidth, this.roomDepth), floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.roomGroup.add(floor);

        const wallMat = new THREE.MeshStandardMaterial({ map: createBasementWallTexture(), roughness: 0.75 });
        this.createRoomWalls(wallMat);

        // Concrete Ceiling with Industrial Pipes
        const ceilMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50, roughness: 0.9 });
        const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(this.roomWidth, this.roomDepth), ceilMat);
        ceiling.position.y = this.wallHeight;
        ceiling.rotation.x = Math.PI / 2;
        this.roomGroup.add(ceiling);

        // Industrial Pipes along ceiling
        const pipeMat = new THREE.MeshStandardMaterial({ color: 0x7f8c8d, metalness: 0.8, roughness: 0.3 });
        const pipe1 = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, this.roomWidth), pipeMat);
        pipe1.rotation.z = Math.PI / 2;
        pipe1.position.set(0, 7.2, -6);
        this.roomGroup.add(pipe1);

        const pipe2 = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, this.roomDepth), pipeMat);
        pipe2.rotation.x = Math.PI / 2;
        pipe2.position.set(8, 7.4, 0);
        this.roomGroup.add(pipe2);

        // Basement Props:
        // 1. Brick Furnace / Boiler with glowing hearth
        this.buildFurnace(0, -11.0);

        // 2. Stacked Wine / Cider Barrels
        this.buildBarrelStack(12, 6);
        this.buildBarrelStack(13, -7);
        this.buildBarrelStack(-13, -8);

        // 3. Carpenter's Heavy Workbench with Tools
        this.buildWorkbench(-11, 4);

        // 4. Vintage Washing Machine & Laundry Basket
        this.buildWashingMachine(-6, -10.5);

        // 5. Wooden Storage Crates & Pallet
        this.buildPalletWithCrates(6, -2);
        this.buildPalletWithCrates(-4, 6);

        // 6. Bare Edison Bulb hanging on cable
        this.buildHangingBulb(0, 6.0, 1);
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
}
