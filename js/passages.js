import * as THREE from 'three';
import { createParquetTexture, createGrassTexture, createRugTexture, createStarfieldTexture, createDoorSignTexture, createSandTexture } from './textures.js';

// Endless mode: the cat walks through a passage from one room to the next.
// Every passage is a strip along the x axis: the cat comes in at the west end
// (the door back) and walks east to the door into the next room.
const LENGTH = 34;       // the room width, so the doors sit on the west and east walls
const HALF_WIDTH = 3;    // the strip is 6 wide (z from -3 to 3)
const STAIRS_FROM = -9;  // stairs run from x = -9 to x = 9
const STAIRS_TO = 9;
const STAIRS_STEPS = 18;
const STAIRS_RISE = 5;   // how much higher (or lower) the top of the stairs is

/**
 * Which passage connects two rooms of endless.json. A door can pick its own
 * with "passage"; otherwise it depends on where the rooms are ("place") and
 * on which floor of the house ("floor").
 */
export function passageType(fromRoom, toRoom) {
    const placeA = fromRoom.place || 'house';
    const placeB = toRoom.place || 'house';
    if (placeA === 'space' || placeB === 'space') return 'teleport';
    if (placeA === 'sea' || placeB === 'sea') return 'dive';
    if (placeA === 'house' && placeB === 'house') {
        return (fromRoom.floor || 0) === (toRoom.floor || 0) ? 'corridor' : 'stairs';
    }
    if (placeA === 'house' || placeB === 'house') return 'path';
    return 'road';
}

/**
 * Builds a passage in the environment (replacing the current room).
 * @param {LevelEnvironment} env
 * @param {string} type - 'corridor' | 'stairs' | 'path' | 'road' | 'teleport' | 'dive'
 * @param {object} back  - the room the cat comes from: { id, label, place, floor }
 * @param {object} ahead - the room the passage leads to: { id, label, place, floor }
 */
export function buildPassage(env, type, back, ahead) {
    env.clearCurrentLevel();

    // Everything outside the strip is out of reach
    env.addCollider(0, -(HALF_WIDTH + 5.5), LENGTH + 6, 11);
    env.addCollider(0, HALF_WIDTH + 5.5, LENGTH + 6, 11);

    const doors = [
        { wall: 'west', at: 0, to: back.id, label: back.label },
        { wall: 'east', at: 0, to: ahead.id, label: ahead.label }
    ];

    switch (type) {
        case 'stairs': buildStairs(env, doors, back, ahead); break;
        case 'path': buildPath(env, doors, back, ahead); break;
        case 'road': buildRoad(env, doors); break;
        case 'teleport': buildTeleport(env, doors); break;
        case 'dive': buildDive(env, doors); break;
        default: buildCorridor(env, doors);
    }
    env.addDoors(doors);
}

// ---------- Helpers ----------

function std(color, extra = {}) {
    return new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...extra });
}

function addMesh(parent, geometry, material, x = 0, y = 0, z = 0) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
}

function setSky(env, sky, fogDensity, fogColor = sky) {
    env.scene.background.setHex(sky);
    env.scene.fog.color.setHex(fogColor);
    env.scene.fog.density = fogDensity;
}

// A flat floor piece (x from x1 to x2, full strip width) at height y
function addFloor(env, x1, x2, y, material, width = HALF_WIDTH * 2) {
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(x2 - x1, width), material);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set((x1 + x2) / 2, y + 0.001, 0);
    floor.receiveShadow = true;
    env.roomGroup.add(floor);
    return floor;
}

// Ceiling piece facing down (x from x1 to x2) at height y
function addCeiling(env, x1, x2, y, material) {
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(x2 - x1, HALF_WIDTH * 2), material);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set((x1 + x2) / 2, y, 0);
    env.roomGroup.add(ceiling);
}

// Side walls (along the strip) and end walls (behind the doors), from y1 up to y2
function addWalls(env, material, y1, y2) {
    const h = y2 - y1;
    [[-HALF_WIDTH, 0], [HALF_WIDTH, Math.PI]].forEach(([z, rot]) => {
        const wall = new THREE.Mesh(new THREE.PlaneGeometry(LENGTH, h), material);
        wall.position.set(0, y1 + h / 2, z);
        wall.rotation.y = rot;
        wall.receiveShadow = true;
        env.roomGroup.add(wall);
    });
    [[-LENGTH / 2, Math.PI / 2], [LENGTH / 2, -Math.PI / 2]].forEach(([x, rot]) => {
        const wall = new THREE.Mesh(new THREE.PlaneGeometry(HALF_WIDTH * 2, h), material);
        wall.position.set(x, y1 + h / 2, 0);
        wall.rotation.y = rot;
        env.roomGroup.add(wall);
    });
}

function addLight(env, light, x, y, z) {
    light.position.set(x, y, z);
    env.lightsGroup.add(light);
    return light;
}

// Ceiling lamp: a glowing bulb with a point light
function addLamp(env, x, y, color = 0xffd9a0) {
    addMesh(env.roomGroup, new THREE.SphereGeometry(0.25, 12, 10), new THREE.MeshBasicMaterial({ color: 0xfff3d0 }), x, y, 0);
    addLight(env, new THREE.PointLight(color, 0.9, 14), x, y - 0.4, 0);
}

// A framed painting on a side wall
function addPainting(env, x, y, side, color) {
    const g = new THREE.Group();
    g.position.set(x, y, side * (HALF_WIDTH - 0.06));
    g.rotation.y = side > 0 ? Math.PI : 0;
    addMesh(g, new THREE.BoxGeometry(2.2, 1.6, 0.08), std(0xc8a24a, { metalness: 0.4 }));
    const canvas = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.3), std(color, { roughness: 0.9 }));
    canvas.position.z = 0.05;
    g.add(canvas);
    // A little sun (or moon) on every painting
    const sun = new THREE.Mesh(new THREE.CircleGeometry(0.25, 16), std(0xfff3b0));
    sun.position.set(0.5, 0.3, 0.06);
    g.add(sun);
    const hill = new THREE.Mesh(new THREE.CircleGeometry(0.9, 20, 0, Math.PI), std(0x2d8a4e));
    hill.position.set(-0.2, -0.65, 0.06);
    g.add(hill);
    env.roomGroup.add(g);
}

// Grass, sun, clouds and trees for the passages outside
function outdoors(env) {
    setSky(env, 0x87ceeb, 0.006);
    env.lightsGroup.add(new THREE.HemisphereLight(0xffffff, 0x4a8a32, 0.7));
    env.lightsGroup.add(new THREE.AmbientLight(0xffffff, 0.2));
    const sun = addLight(env, new THREE.DirectionalLight(0xfff2d0, 0.9), 10, 20, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 1024;
    sun.shadow.mapSize.height = 1024;
    Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20 });

    ['sun', 'clouds', 'distantTrees'].forEach(type => env._buildExtra({ type }));
    const grass = new THREE.Mesh(new THREE.PlaneGeometry(LENGTH, 26), new THREE.MeshStandardMaterial({ map: createGrassTexture(), roughness: 0.95 }));
    grass.rotation.x = -Math.PI / 2;
    grass.receiveShadow = true;
    env.roomGroup.add(grass);

    // Trees and flowers on both sides
    env.buildBigTree(-9, -8);
    env.buildBigTree(10, 8.5);
    env.buildFlowerBed(5, -6);
    env.buildFlowerBed(-6, 6);
    env.buildGardenGnome(-1, -5);
    const bush = std(0x2d8a4e, { roughness: 0.9 });
    [[-14, 5], [1, 7], [14, -5], [-4, -9], [7, 4.5]].forEach(([x, z]) => {
        addMesh(env.roomGroup, new THREE.SphereGeometry(1.2, 12, 10), bush, x, 0.7, z).scale.y = 0.75;
    });
}

// A wall across the end of the strip, facing inwards. Only its front side is drawn,
// so the follow camera (which starts just behind it) can look through it.
function addEndWall(env, x, width, height, material) {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
    wall.position.set(x, height / 2, 0);
    wall.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2;
    wall.receiveShadow = true;
    env.roomGroup.add(wall);
}

// A tall hedge across the end of a path, the gate goes into it
function addHedge(env, x) {
    addEndWall(env, x, 26, 2.6, std(0x2d6a4f, { roughness: 0.95 }));
}

// The outside wall of the house, with the door back inside
function addHouseFront(env, x) {
    const dir = Math.sign(x);
    const g = new THREE.Group();
    g.position.set(x + dir * 0.5, 0, 0);
    env.roomGroup.add(g);
    addEndWall(env, x, 26, 7.5, std(0xf5e6ca, { roughness: 0.8 }));
    addMesh(g, new THREE.BoxGeometry(1.6, 0.6, 26.5), std(0xa0412d), 0, 7.8, 0);
    // Windows with shutters on both sides of the door
    const glass = std(0x9fd3f0, { metalness: 0.3, roughness: 0.1, emissive: 0x30506a });
    const shutter = std(0x2e86de);
    [-6, 6].forEach(z => {
        addMesh(g, new THREE.BoxGeometry(0.2, 2.2, 2.4), glass, -dir * 0.5, 3.6, z);
        addMesh(g, new THREE.BoxGeometry(0.25, 2.4, 0.7), shutter, -dir * 0.5, 3.6, z - 1.6);
        addMesh(g, new THREE.BoxGeometry(0.25, 2.4, 0.7), shutter, -dir * 0.5, 3.6, z + 1.6);
    });
}

// ---------- Passages ----------

// Indoors on the same floor: a cosy hallway with paintings and a long rug
function buildCorridor(env, doors) {
    setSky(env, 0x12141a, 0.018);
    env.lightsGroup.add(new THREE.AmbientLight(0xfff1e0, 0.45));
    [-10, 0, 10].forEach(x => addLamp(env, x, 5.6));

    const floorTex = createParquetTexture();
    floorTex.repeat.set(4, 0.7);
    addFloor(env, -LENGTH / 2, LENGTH / 2, 0, new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.5 }));
    addFloor(env, -13, 13, 0.01, new THREE.MeshStandardMaterial({ map: createRugTexture(), roughness: 0.85 }), 2.4);

    addWalls(env, std(0xf3e5c8, { roughness: 0.85 }), 0, 6);
    addCeiling(env, -LENGTH / 2, LENGTH / 2, 6, std(0xfaf3e0, { roughness: 0.9 }));
    // Wooden panels along the bottom of the walls
    [-1, 1].forEach(side => {
        const panel = addMesh(env.roomGroup, new THREE.BoxGeometry(LENGTH, 1.3, 0.08), std(0xa47148), 0, 0.65, side * (HALF_WIDTH - 0.04));
        panel.castShadow = false;
    });
    [[-11, -1, 0x74b9ff], [-4, 1, 0xfd79a8], [4, -1, 0xffeaa7], [11, 1, 0x6c5ce7]].forEach(([x, side, c]) => {
        addPainting(env, x, 3.3, side, c);
    });
    doors.forEach(d => { d.style = 'door'; });
}

// Indoors between floors: a staircase up (attic) or down (basement)
function buildStairs(env, doors, back, ahead) {
    const rise = (ahead.floor || 0) > (back.floor || 0) ? STAIRS_RISE : -STAIRS_RISE;
    const low = Math.min(0, rise);
    const high = Math.max(0, rise);
    const toBasement = Math.min(back.floor || 0, ahead.floor || 0) < 0;
    const run = STAIRS_TO - STAIRS_FROM;

    env.heightFn = (x) => rise * Math.min(1, Math.max(0, (x - STAIRS_FROM) / run));

    setSky(env, 0x12141a, 0.018);
    env.lightsGroup.add(new THREE.AmbientLight(0xfff1e0, toBasement ? 0.3 : 0.45));
    addLamp(env, -13, 5.8);
    addLamp(env, 0, rise / 2 + 5.8);
    addLamp(env, 13, rise + 5.8);

    // Landings at the bottom and the top, steps in between
    const landingMat = std(toBasement ? 0x7f8c8d : 0x8d6e63, { roughness: 0.8 });
    addFloor(env, -LENGTH / 2, STAIRS_FROM, 0, landingMat);
    addFloor(env, STAIRS_TO, LENGTH / 2, rise, landingMat);
    const stepMats = [std(toBasement ? 0x95a5a6 : 0xa1887f), std(toBasement ? 0x7f8c8d : 0x8d6e63)];
    const carpet = std(0xb33939, { roughness: 0.9 });
    const stepW = run / STAIRS_STEPS;
    for (let i = 0; i < STAIRS_STEPS; i++) {
        const x = STAIRS_FROM + (i + 0.5) * stepW;
        const top = rise * (i + 0.5) / STAIRS_STEPS;
        const bottom = low - 0.3;
        addMesh(env.roomGroup, new THREE.BoxGeometry(stepW, top - bottom, HALF_WIDTH * 2), stepMats[i % 2], x, (top + bottom) / 2, 0);
        if (!toBasement) addMesh(env.roomGroup, new THREE.BoxGeometry(stepW + 0.02, 0.04, 2.6), carpet, x, top + 0.02, 0);
    }

    addWalls(env, std(toBasement ? 0x8a8478 : 0xd9c9a3, { roughness: 0.9 }), low - 0.3, high + 6.5);
    const ceilingMat = std(0xfaf3e0, { roughness: 0.9 });
    addCeiling(env, -LENGTH / 2, STAIRS_FROM, 6.5, ceilingMat);
    addCeiling(env, STAIRS_TO, LENGTH / 2, rise + 6.5, ceilingMat);
    const slope = new THREE.Group();
    slope.position.set(0, rise / 2 + 6.5, 0);
    slope.rotation.z = Math.atan2(rise, run);
    const sloped = new THREE.Mesh(new THREE.PlaneGeometry(Math.hypot(run, rise), HALF_WIDTH * 2), ceilingMat);
    sloped.rotation.x = Math.PI / 2;
    slope.add(sloped);
    env.roomGroup.add(slope);

    // Handrails on both sides
    const railMat = std(0x5d4037, { roughness: 0.5 });
    [-1, 1].forEach(side => {
        const rail = addMesh(env.roomGroup, new THREE.CylinderGeometry(0.08, 0.08, Math.hypot(run, rise)), railMat, 0, rise / 2 + 1.1, side * (HALF_WIDTH - 0.2));
        rail.rotation.z = Math.atan2(rise, run) - Math.PI / 2;
        [STAIRS_FROM, STAIRS_TO].forEach((x, i) => {
            addMesh(env.roomGroup, new THREE.CylinderGeometry(0.12, 0.12, 1.2), railMat, x, i * rise + 0.6, side * (HALF_WIDTH - 0.2));
        });
    });

    doors[1].y = rise;
    doors.forEach(d => { d.style = 'door'; });
}

// From the house to the outside: a garden path with stepping stones and a picket fence
function buildPath(env, doors, back, ahead) {
    outdoors(env);
    addFloor(env, -LENGTH / 2, LENGTH / 2, 0.02, std(0xc8a26b, { roughness: 1 }), 3.4);
    const stone = std(0x95a5a6, { roughness: 0.9 });
    for (let x = -15; x <= 15; x += 2.2) {
        const s = addMesh(env.roomGroup, new THREE.CylinderGeometry(0.7, 0.75, 0.1, 10), stone, x, 0.05, Math.sin(x * 1.7) * 0.4);
        s.castShadow = false;
    }
    const picket = std(0xffffff, { roughness: 0.6 });
    [-1, 1].forEach(side => {
        const z = side * (HALF_WIDTH + 0.1);
        for (let x = -16; x <= 16; x += 1.2) {
            addMesh(env.roomGroup, new THREE.BoxGeometry(0.18, 1.2, 0.08), picket, x, 0.6, z);
        }
        [0.4, 0.9].forEach(y => addMesh(env.roomGroup, new THREE.BoxGeometry(LENGTH, 0.1, 0.05), picket, 0, y, z));
    });

    // The house is at one end, a garden gate at the other
    const houseIsBack = (back.place || 'house') === 'house';
    addHouseFront(env, houseIsBack ? -LENGTH / 2 : LENGTH / 2);
    addHedge(env, houseIsBack ? LENGTH / 2 : -LENGTH / 2);
    doors[0].style = houseIsBack ? 'door' : 'gate';
    doors[1].style = houseIsBack ? 'gate' : 'door';
}

// Between two places outside: a little road with street lamps and a signpost
function buildRoad(env, doors) {
    outdoors(env);
    addFloor(env, -LENGTH / 2, LENGTH / 2, 0.02, std(0x3d3d3d, { roughness: 0.95 }), 4.6);
    const white = new THREE.MeshBasicMaterial({ color: 0xf5f6fa });
    for (let x = -15.5; x <= 15.5; x += 3) {
        addFloor(env, x - 0.75, x + 0.75, 0.03, white, 0.15);
    }
    const curb = std(0xbdc3c7, { roughness: 0.8 });
    const hedge = std(0x2d6a4f, { roughness: 0.95 });
    [-1, 1].forEach(side => {
        addMesh(env.roomGroup, new THREE.BoxGeometry(LENGTH, 0.2, 0.4), curb, 0, 0.1, side * 2.5);
        addMesh(env.roomGroup, new THREE.BoxGeometry(LENGTH, 1.0, 0.8), hedge, 0, 0.5, side * (HALF_WIDTH + 0.5));
    });

    // Street lamps on alternating sides
    const pole = std(0x2f3542, { metalness: 0.6, roughness: 0.4 });
    [[-9, -1], [0, 1], [9, -1]].forEach(([x, side]) => {
        const z = side * (HALF_WIDTH + 0.4);
        addMesh(env.roomGroup, new THREE.CylinderGeometry(0.1, 0.14, 5), pole, x, 2.5, z);
        addMesh(env.roomGroup, new THREE.BoxGeometry(0.1, 0.1, 1.2), pole, x, 5, z - side * 0.6);
        addMesh(env.roomGroup, new THREE.SphereGeometry(0.3, 10, 8), new THREE.MeshBasicMaterial({ color: 0xfff3b0 }), x, 4.8, z - side * 1.1);
    });

    // Signpost pointing the way (readable when walking towards it)
    const post = new THREE.Group();
    post.position.set(11, 0, -HALF_WIDTH - 0.3);
    post.rotation.y = -Math.PI / 2;
    addMesh(post, new THREE.CylinderGeometry(0.1, 0.1, 3.4), std(0x6d4c41), 0, 1.7, 0);
    const board = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.6), new THREE.MeshBasicMaterial({ map: createDoorSignTexture(`${doors[1].label} ➡`), side: THREE.DoubleSide }));
    board.position.set(0, 3, 0.15);
    post.add(board);
    env.roomGroup.add(post);

    addHedge(env, -LENGTH / 2);
    addHedge(env, LENGTH / 2);
    doors.forEach(d => { d.style = 'gate'; });
}

// Between earth and the spaceship: a swirling teleporter tunnel full of light rings
function buildTeleport(env, doors) {
    setSky(env, 0x05050f, 0.02, 0x1b0b3a);
    env.lightsGroup.add(new THREE.AmbientLight(0x8e7cff, 0.7));
    [-10, 0, 10].forEach(x => addLight(env, new THREE.PointLight(0x48dbfb, 1.0, 14), x, 4, 0));

    // Star tunnel (seen from the inside), drifting past
    const radius = 3.6;
    const centerY = 2.4;
    const starTex = createStarfieldTexture();
    starTex.wrapS = THREE.RepeatWrapping;
    starTex.wrapT = THREE.RepeatWrapping;
    starTex.repeat.set(2, 4);
    const tunnel = new THREE.Mesh(
        new THREE.CylinderGeometry(radius, radius, LENGTH, 32, 1, true),
        new THREE.MeshBasicMaterial({ map: starTex, side: THREE.BackSide })
    );
    tunnel.rotation.z = Math.PI / 2;
    tunnel.position.y = centerY;
    env.roomGroup.add(tunnel);
    const endMat = new THREE.MeshBasicMaterial({ color: 0x1b0b3a });
    [[-LENGTH / 2, Math.PI / 2], [LENGTH / 2, -Math.PI / 2]].forEach(([x, rot]) => {
        const end = new THREE.Mesh(new THREE.CircleGeometry(radius, 32), endMat);
        end.position.set(x, centerY, 0);
        end.rotation.y = rot;
        env.roomGroup.add(end);
    });

    // Glowing floor with a light strip down the middle
    const floorWidth = 2 * Math.sqrt(radius * radius - centerY * centerY);
    addFloor(env, -LENGTH / 2, LENGTH / 2, 0, std(0x1e272e, { metalness: 0.6, roughness: 0.3, emissive: 0x0a3d62, emissiveIntensity: 0.5 }), floorWidth);
    const stripMat = new THREE.MeshBasicMaterial({ color: 0x48dbfb, transparent: true, opacity: 0.5 });
    addFloor(env, -LENGTH / 2, LENGTH / 2, 0.01, stripMat, 0.8);

    // Rings of light flying along the tunnel
    const rings = [];
    for (let i = 0; i < 10; i++) {
        const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color().setHSL(0.5 + i * 0.05, 0.9, 0.6) });
        const ring = new THREE.Mesh(new THREE.TorusGeometry(radius - 0.25, 0.07, 8, 40), mat);
        ring.rotation.y = Math.PI / 2;
        ring.position.set(-LENGTH / 2 + i * (LENGTH / 10), centerY, 0);
        env.roomGroup.add(ring);
        rings.push(ring);
    }

    // Sparkles streaming past
    const count = 160;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = 1 + Math.random() * (radius - 1.3);
        positions[i * 3] = (Math.random() - 0.5) * LENGTH;
        positions[i * 3 + 1] = centerY + Math.sin(a) * r;
        positions[i * 3 + 2] = Math.cos(a) * r;
    }
    const sparkleGeo = new THREE.BufferGeometry();
    sparkleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const sparkles = new THREE.Points(sparkleGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.12 }));
    env.roomGroup.add(sparkles);

    env.animate((dt, t) => {
        starTex.offset.y += dt * 0.15;
        stripMat.opacity = 0.35 + Math.sin(t * 5) * 0.2;
        rings.forEach((ring, i) => {
            ring.position.x += dt * 6;
            if (ring.position.x > LENGTH / 2) ring.position.x -= LENGTH;
            ring.material.color.setHSL((0.5 + i * 0.05 + t * 0.1) % 1, 0.9, 0.6);
        });
        for (let i = 0; i < count; i++) {
            positions[i * 3] += dt * 12;
            if (positions[i * 3] > LENGTH / 2) positions[i * 3] -= LENGTH;
        }
        sparkleGeo.attributes.position.needsUpdate = true;
    });

    doors.forEach(d => { d.style = 'portal'; });
}

// Down to the bottom of the sea: a glass tunnel through the water, with fish swimming around it
function buildDive(env, doors) {
    setSky(env, 0x0a4f7a, 0.03, 0x0e6a8f);
    env.lightsGroup.add(new THREE.HemisphereLight(0x9be7ff, 0x0b3d5c, 0.8));
    env.lightsGroup.add(new THREE.AmbientLight(0x7fd6ff, 0.35));
    [-10, 0, 10].forEach(x => addLight(env, new THREE.PointLight(0x48dbfb, 0.8, 12), x, 4.5, 0));

    // Sand outside the tunnel, a walkway inside
    const sand = new THREE.Mesh(new THREE.PlaneGeometry(LENGTH + 20, 40), new THREE.MeshStandardMaterial({ map: createSandTexture(), roughness: 0.95 }));
    sand.rotation.x = -Math.PI / 2;
    sand.position.y = -0.02;
    env.roomGroup.add(sand);
    addFloor(env, -LENGTH / 2, LENGTH / 2, 0, std(0x34495e, { metalness: 0.4, roughness: 0.4 }));
    const stripMat = new THREE.MeshBasicMaterial({ color: 0x48dbfb, transparent: true, opacity: 0.5 });
    addFloor(env, -LENGTH / 2, LENGTH / 2, 0.01, stripMat, 0.4);

    // The glass tube with metal rings holding it together
    const radius = 5.6; // tall enough for the door signs
    const glass = new THREE.Mesh(
        new THREE.CylinderGeometry(radius, radius, LENGTH, 32, 1, true, 0, Math.PI),
        new THREE.MeshStandardMaterial({ color: 0xdff9fb, transparent: true, opacity: 0.18, roughness: 0.05, side: THREE.DoubleSide, depthWrite: false })
    );
    glass.rotation.z = Math.PI / 2;
    env.roomGroup.add(glass);
    const ringMat = std(0x95a5a6, { metalness: 0.7, roughness: 0.3 });
    for (let x = -LENGTH / 2 + 2; x < LENGTH / 2; x += 4) {
        const ring = addMesh(env.roomGroup, new THREE.TorusGeometry(radius, 0.08, 6, 24, Math.PI), ringMat, x, 0, 0);
        ring.rotation.y = Math.PI / 2;
    }

    // Steel bulkheads with hatches at both ends
    const bulkhead = std(0x57606f, { metalness: 0.6, roughness: 0.4 });
    [[-LENGTH / 2, Math.PI / 2], [LENGTH / 2, -Math.PI / 2]].forEach(([x, rot]) => {
        const end = new THREE.Mesh(new THREE.CircleGeometry(radius, 32, 0, Math.PI), bulkhead);
        end.position.set(x, 0, 0);
        end.rotation.set(0, rot, 0);
        env.roomGroup.add(end);
    });

    // Coral, seaweed and rocks on the sea floor around the tunnel
    [[-12, -6, '0xff7675'], [-3, 6, '0xfdcb6e'], [7, -7, '0xa29bfe'], [13, 6, '0x55efc4']].forEach(([x, z, color]) => env.buildCoral(x, z, color));
    [[-8, 6], [3, -6], [11, -5]].forEach(([x, z]) => env.buildSeaweed(x, z));
    env.buildSeaRock(-14, 7);
    env.buildJellyfish(-5, 5, -6, '0xff9ff3');
    env.buildJellyfish(9, 6, 5, '0x48dbfb');
    env._buildExtra({ type: 'fishSchool', count: 3 });
    env._buildExtra({ type: 'bubbles' });

    doors.forEach(d => { d.style = 'door'; });
}
