import * as THREE from 'three';
import {
    createWaterTexture, createCobblesTexture, createBrickTexture, createBridgeDeckTexture,
    createCubeFacadeTexture, createMarkthalMuralTexture, createContainerTexture,
    createGlassFacadeTexture
} from './textures.js';
import { std, addMesh, beam, scaleUV, group, addSign, addRailing, seeded, tower } from './buildkit.js';

// Props and scenery of the Rotterdam endless world (endless_rotterdam.json):
// the Erasmus Bridge, the Cube Houses, the Markthal and the container harbour.
// Every builder takes the LevelEnvironment as its first argument.

// ---------- The Erasmus Bridge ----------

// The river runs along z between the quays at x = -11 and x = 11.
// The bridge deck crosses it along x and rises in a gentle hump, so the cat walks up and over.
const RIVER_HALF = 11;
const DECK_HALF = 3.2;
const DECK_PEAK = 1.6;
const RIVER_WATER_Y = -2.6;
const PYLON_X = 5;

export function bridgeDeckHeight(x) {
    const t = x / RIVER_HALF;
    return Math.abs(t) < 1 ? DECK_PEAK * (1 - t * t) : 0;
}

// A plane along x that follows the hump of the deck (offset: height above the road)
function bendAlongDeck(geometry, offset) {
    const pos = geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setY(i, pos.getY(i) + bridgeDeckHeight(pos.getX(i)) + offset);
    pos.needsUpdate = true;
    geometry.computeVertexNormals();
    return geometry;
}

/**
 * The whole bridge room: the river with boats, cobbled quays on both banks,
 * and the light blue "Swan" with its pylon and cables. The cat walks on the
 * deck (room.heightFn), the water on both sides is blocked by colliders.
 */
export function buildErasmusBridge(env) {
    env.heightFn = (x, z) => (Math.abs(z) < DECK_HALF + 0.6 ? bridgeDeckHeight(x) : 0);
    env.wallHeight = 2.5; // the doors on the quays are open gates
    const root = env.roomGroup;

    // The Nieuwe Maas, flowing along
    const waterTex = createWaterTexture();
    waterTex.repeat.set(3, 70);
    const water = new THREE.Mesh(new THREE.PlaneGeometry(RIVER_HALF * 2, 600), new THREE.MeshStandardMaterial({ map: waterTex, roughness: 0.2, metalness: 0.3 }));
    water.rotation.x = -Math.PI / 2;
    water.position.y = RIVER_WATER_Y;
    root.add(water);
    env.animate((dt, t) => {
        waterTex.offset.y += dt * 0.03;
        water.position.y = RIVER_WATER_Y + Math.sin(t * 0.8) * 0.06;
    });
    // Out of reach: the river on both sides of the deck
    env.addCollider(0, -(13 + DECK_HALF) / 2, RIVER_HALF * 2, 13 - DECK_HALF);
    env.addCollider(0, (13 + DECK_HALF) / 2, RIVER_HALF * 2, 13 - DECK_HALF);

    // Both banks: the city ground, cobbled quays in the room, brick quay walls down to the water
    const railMat = std(0x9fb7c9, { metalness: 0.6, roughness: 0.35 });
    [-1, 1].forEach(side => {
        const land = new THREE.Mesh(new THREE.PlaneGeometry(200, 600), std(0x7f817c, { roughness: 0.95 }));
        land.rotation.x = -Math.PI / 2;
        land.position.set(side * (RIVER_HALF + 100), -0.01, 0);
        land.receiveShadow = true;
        root.add(land);

        const cobbles = createCobblesTexture();
        cobbles.repeat.set(1, 4);
        const quay = new THREE.Mesh(new THREE.PlaneGeometry(6, 26), new THREE.MeshStandardMaterial({ map: cobbles, bumpMap: cobbles, bumpScale: 0.015, roughness: 0.85 }));
        quay.rotation.x = -Math.PI / 2;
        quay.position.set(side * (RIVER_HALF + 3), 0.005, 0);
        quay.receiveShadow = true;
        root.add(quay);

        const brick = createBrickTexture();
        brick.repeat.set(80, 1);
        const wallH = -RIVER_WATER_Y + 0.5;
        const quayWall = new THREE.Mesh(new THREE.PlaneGeometry(600, wallH), new THREE.MeshStandardMaterial({ map: brick, roughness: 0.9 }));
        quayWall.position.set(side * RIVER_HALF, -wallH / 2, 0);
        quayWall.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
        root.add(quayWall);

        // Railings along the water (not where the bridge starts) and along the edges of the room
        const qx = side * (RIVER_HALF + 0.3);
        addRailing(root, new THREE.Vector3(qx, 0, -12.8), new THREE.Vector3(qx, 0, -DECK_HALF - 0.4), railMat);
        addRailing(root, new THREE.Vector3(qx, 0, DECK_HALF + 0.4), new THREE.Vector3(qx, 0, 12.8), railMat);
        [-1, 1].forEach(end => {
            addRailing(root, new THREE.Vector3(qx, 0, end * 12.8), new THREE.Vector3(side * 16.8, 0, end * 12.8), railMat);
            addRailing(root, new THREE.Vector3(side * 16.8, 0, end * 12.8), new THREE.Vector3(side * 16.8, 0, end * 2.2), railMat);
        });

        // Street name sign at the start of the bridge
        const post = group(env, side * 12.4, -DECK_HALF - 1.2, side < 0 ? Math.PI / 2 : -Math.PI / 2);
        addMesh(post, new THREE.CylinderGeometry(0.07, 0.07, 3), std(0x2f3542, { metalness: 0.5 }), 0, 1.5, 0);
        addSign(post, 'Erasmusbrug', 2.4, 0, 2.7, 0.1);
        env.addCollider(side * 12.4, -DECK_HALF - 1.2, 0.3, 0.3);
    });

    buildBridgeDeck(env);
    buildPylon(env);
    buildBoats(env);
}

function buildBridgeDeck(env) {
    const root = env.roomGroup;
    const length = RIVER_HALF * 2 + 0.4;
    const width = DECK_HALF * 2 + 0.4;

    // Road surface (bike lanes, tram rails), the underside and the blue edges
    const deckTex = createBridgeDeckTexture();
    deckTex.repeat.set(4, 1);
    const deck = new THREE.Mesh(
        bendAlongDeck(new THREE.PlaneGeometry(length, width, 48, 1).rotateX(-Math.PI / 2), 0.02),
        new THREE.MeshStandardMaterial({ map: deckTex, roughness: 0.8 })
    );
    deck.receiveShadow = true;
    root.add(deck);
    const under = new THREE.Mesh(
        bendAlongDeck(new THREE.PlaneGeometry(length, width, 48, 1).rotateX(Math.PI / 2), -0.8),
        std(0x6f8496, { roughness: 0.7 })
    );
    root.add(under);
    const edgeMat = std(0x4f86c6, { metalness: 0.3, roughness: 0.4 });
    [-1, 1].forEach(side => {
        const edge = new THREE.Mesh(bendAlongDeck(new THREE.PlaneGeometry(length, 0.82, 48, 1).translate(0, -0.39, 0), 0), edgeMat);
        edge.position.z = side * (width / 2);
        if (side < 0) edge.rotation.y = Math.PI;
        root.add(edge);
    });

    // The bascule bridge at the south end: dark seams across the road where it opens
    const seamMat = new THREE.MeshBasicMaterial({ color: 0x1e272e });
    [7.6, 10.8].forEach(x => addMesh(root, new THREE.BoxGeometry(0.08, 0.02, width), seamMat, x, bridgeDeckHeight(x) + 0.03, 0));

    // Railings and lamp posts along both sides
    const railMat = std(0x9fb7c9, { metalness: 0.6, roughness: 0.35 });
    const poleMat = std(0x9fb7c9, { metalness: 0.6, roughness: 0.35 });
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xfff3d0 });
    [-1, 1].forEach(side => {
        const z = side * (DECK_HALF + 0.05);
        addRailing(root, new THREE.Vector3(-RIVER_HALF, 0, z), new THREE.Vector3(RIVER_HALF, 0, z), railMat, 1.1, bridgeDeckHeight);
        [-8, -2.5, 9].forEach(x => {
            const base = new THREE.Vector3(x, bridgeDeckHeight(x), side * (DECK_HALF + 0.15));
            const top = base.clone().setY(base.y + 5);
            beam(root, base, top, 0.09, poleMat, 0.06);
            const arm = top.clone().setZ(top.z - side * 1.0);
            beam(root, top, arm, 0.05, poleMat);
            addMesh(root, new THREE.SphereGeometry(0.2, 10, 8), glowMat, arm.x, arm.y - 0.15, arm.z).castShadow = false;
        });
    });

    // Concrete piers under the pylon and under the bascule bridge
    const pierMat = std(0xb8b5ac, { roughness: 0.9 });
    [[PYLON_X, 2.4, 10], [9.2, 3.0, 8]].forEach(([x, w, d]) => {
        const top = bridgeDeckHeight(x) - 0.8;
        const h = top - RIVER_WATER_Y + 0.5;
        addMesh(root, new THREE.BoxGeometry(w, h, d), pierMat, x, top - h / 2, 0);
    });
}

// "De Zwaan" (the Swan): two legs that join into one bent mast, with the cables fanning out
function buildPylon(env) {
    const root = env.roomGroup;
    const mat = std(0xb7d4ea, { metalness: 0.35, roughness: 0.35 });
    const baseY = bridgeDeckHeight(PYLON_X) - 0.8;
    const knee = new THREE.Vector3(PYLON_X + 0.8, 10, 0);
    const top = new THREE.Vector3(PYLON_X + 3.6, 20.5, 0);
    [-1, 1].forEach(side => beam(root, new THREE.Vector3(PYLON_X, baseY, side * 4.3), knee, 0.55, mat, 0.45));
    addMesh(root, new THREE.BoxGeometry(1.2, 0.8, 9.4), mat, PYLON_X, baseY - 0.2, 0);
    beam(root, knee, top, 0.6, mat, 0.32);
    addMesh(root, new THREE.SphereGeometry(0.45, 12, 10), mat, knee.x, knee.y, knee.z);
    addMesh(root, new THREE.SphereGeometry(0.34, 12, 10), mat, top.x, top.y, top.z);

    // Cables: a fan down to the long span, and two thick back stays behind the pylon
    const cableMat = std(0xe8f1f8, { metalness: 0.4, roughness: 0.4 });
    const onMast = t => new THREE.Vector3().lerpVectors(knee, top, t);
    for (let i = 0; i < 8; i++) {
        const x = -10 + i * 1.6;
        const from = onMast(1 - 0.6 * (i / 7));
        [-1, 1].forEach(side => {
            beam(root, from, new THREE.Vector3(x, bridgeDeckHeight(x) + 1.1, side * DECK_HALF), 0.035, cableMat, 0.035, 5).castShadow = false;
        });
    }
    [0.98, 0.9].forEach(t => {
        [-1, 1].forEach(side => {
            const x = 10.6;
            beam(root, onMast(t), new THREE.Vector3(x, bridgeDeckHeight(x) + 1.1, side * DECK_HALF), 0.08, cableMat, 0.08, 6).castShadow = false;
        });
    });
}

// A yellow water taxi, a Spido tour boat and a container barge sailing under the bridge
function buildBoats(env) {
    const boats = [];
    const addBoat = (g, x, speed, offset) => {
        env.roomGroup.add(g);
        boats.push({ g, x, speed, offset });
    };

    const taxi = new THREE.Group();
    addMesh(taxi, new THREE.BoxGeometry(1.4, 0.6, 3.2), std(0xf9ca24, { roughness: 0.4 }), 0, 0.3, 0);
    const bow = addMesh(taxi, new THREE.ConeGeometry(0.7, 1.2, 4), std(0xf9ca24, { roughness: 0.4 }), 0, 0.3, 2.2);
    bow.rotation.x = Math.PI / 2;
    bow.rotation.y = Math.PI / 4;
    bow.scale.set(1, 1, 0.45);
    addMesh(taxi, new THREE.BoxGeometry(1.2, 0.6, 1.4), std(0x1e272e, { roughness: 0.3, metalness: 0.4 }), 0, 0.9, -0.2);
    addBoat(taxi, -7, 11, 0);

    const spido = new THREE.Group();
    addMesh(spido, new THREE.BoxGeometry(2.4, 1.0, 7), std(0xffffff, { roughness: 0.5 }), 0, 0.5, 0);
    addMesh(spido, new THREE.BoxGeometry(2.42, 0.25, 7.02), std(0x1e4fa3), 0, 0.25, 0);
    addMesh(spido, new THREE.BoxGeometry(2.0, 0.9, 5.2), std(0x7fb8e0, { roughness: 0.1, metalness: 0.5 }), 0, 1.45, -0.3);
    addMesh(spido, new THREE.BoxGeometry(2.1, 0.12, 5.4), std(0xffffff), 0, 1.95, -0.3);
    addBoat(spido, -1.5, -3.5, 90);

    const barge = new THREE.Group();
    addMesh(barge, new THREE.BoxGeometry(2.6, 1.0, 14), std(0x2d3436, { roughness: 0.6 }), 0, 0.5, 0);
    addMesh(barge, new THREE.BoxGeometry(2.0, 1.6, 2.0), std(0xffffff), 0, 1.8, -6);
    [0xc0392b, 0x2e86de, 0x27ae60, 0xe67e22].forEach((c, i) => {
        addMesh(barge, new THREE.BoxGeometry(2.2, 1.2, 2.6), containerMaterial(c), 0, 1.6, -3 + i * 2.8);
    });
    addBoat(barge, 1.8, 2.5, 200);

    const span = 260;
    env.animate((dt, t) => boats.forEach(b => {
        const z = (((t * b.speed + b.offset) % span) + span) % span - span / 2;
        b.g.position.set(b.x, RIVER_WATER_Y + Math.sin(t * 2 + b.offset) * 0.05, b.speed > 0 ? z : -z);
        b.g.rotation.y = b.speed > 0 ? 0 : Math.PI;
    }));
}

// ---------- Rotterdam skyline ----------

/**
 * Tall buildings all around, with the famous ones: the Euromast, De Rotterdam,
 * Hotel New York, the leaning KPN tower and the Witte Huis.
 * river: keep the river free (the bridge room). ground: a city floor outside the walls.
 */
export function buildRotterdamSkyline(env, extra = {}) {
    const root = env.roomGroup;
    if (extra.ground) {
        const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), std(0x7f817c, { roughness: 1 }));
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.03;
        root.add(ground);
    }
    const glass = [createGlassFacadeTexture('#7fa7c9'), createGlassFacadeTexture('#9fb4c4'), createGlassFacadeTexture('#5f8fb0')];
    const concrete = std(0xd8d4cc, { roughness: 0.8 });

    // Euromast: a concrete tower with the crow's nest and the space tower on top
    const mast = new THREE.Group();
    mast.position.set(-48, 0, -58);
    root.add(mast);
    addMesh(mast, new THREE.CylinderGeometry(1.2, 1.4, 30, 16), concrete, 0, 15, 0);
    addMesh(mast, new THREE.CylinderGeometry(3.6, 3.2, 2.2, 20), concrete, 0, 30, 0);
    addMesh(mast, new THREE.CylinderGeometry(3.7, 3.7, 0.6, 20), std(0x2f3542), 0, 29, 0);
    addMesh(mast, new THREE.CylinderGeometry(0.45, 0.7, 20, 10), std(0xdfe6e9, { metalness: 0.5 }), 0, 41, 0);
    addMesh(mast, new THREE.CylinderGeometry(0.1, 0.25, 3, 6), std(0xd63031), 0, 52.5, 0);

    // De Rotterdam: three towers, each with an upper half shifted sideways
    [0, 1, 2].forEach(i => {
        const x = 32 + i * 5.2;
        tower(root, x, -34, 5, 17, 6, glass[1]);
        tower(root, x + (i % 2 ? -0.8 : 0.8), -33 + (i === 1 ? -1.2 : 1), 5, 15 + i * 2, 6, glass[1], 17);
    });

    // Hotel New York: red brick with two green-roofed clock towers
    const hotel = new THREE.Group();
    hotel.position.set(28, 0, 34);
    hotel.rotation.y = -0.3;
    root.add(hotel);
    const brick = createBrickTexture();
    brick.repeat.set(3, 2);
    addMesh(hotel, new THREE.BoxGeometry(14, 8, 7), new THREE.MeshStandardMaterial({ map: brick, roughness: 0.9 }), 0, 4, 0);
    const copper = std(0x4aa58a, { roughness: 0.6 });
    [-5, 5].forEach(tx => {
        addMesh(hotel, new THREE.BoxGeometry(2.4, 4, 2.4), new THREE.MeshStandardMaterial({ map: brick, roughness: 0.9 }), tx, 10, 0);
        const roof = addMesh(hotel, new THREE.ConeGeometry(2, 3.2, 4), copper, tx, 13.6, 0);
        roof.rotation.y = Math.PI / 4;
        addMesh(hotel, new THREE.CircleGeometry(0.7, 16), std(0xffffff), tx, 10.4, -1.22).rotation.y = Math.PI;
    });

    // KPN tower: a grey block with a leaning front full of little lights
    const kpn = new THREE.Group();
    kpn.position.set(44, 0, 10);
    root.add(kpn);
    addMesh(kpn, new THREE.BoxGeometry(7, 26, 7), std(0x95a5a6, { roughness: 0.6 }), 0, 13, 0);
    const front = tower(kpn, -4, 0, 1, 28, 8, createGlassFacadeTexture('#3fbf7f'));
    front.rotation.z = -0.12;

    // Witte Huis: the old white skyscraper with its little corner towers
    const white = new THREE.Group();
    white.position.set(-32, 0, 22);
    root.add(white);
    addMesh(white, new THREE.BoxGeometry(6, 14, 6), std(0xf5f0e6, { roughness: 0.7 }), 0, 7, 0);
    const slate = std(0x3d4a5c, { roughness: 0.6 });
    addMesh(white, new THREE.ConeGeometry(2.4, 4, 4), slate, 0, 16, 0).rotation.y = Math.PI / 4;
    [[-2.6, -2.6], [2.6, -2.6], [-2.6, 2.6], [2.6, 2.6]].forEach(([cx, cz]) => {
        addMesh(white, new THREE.CylinderGeometry(0.7, 0.7, 2, 8), std(0xf5f0e6), cx, 15, cz);
        addMesh(white, new THREE.ConeGeometry(0.8, 1.6, 8), slate, cx, 16.8, cz);
    });

    const landmarks = [[-48, -58], [37, -34], [28, 34], [44, 10], [-32, 22]];

    // Low city blocks close by: brick, plaster and glass, with flat roofs
    const blockColors = [0xb5654a, 0xd9cbb3, 0x8c5a44, 0xe8e2d6, 0x9aa5ad, 0xc77f5c];
    for (let i = 0; i < 40; i++) {
        const a = (i / 40) * Math.PI * 2;
        const r = 27 + seeded(i + 90) * 7;
        const x = Math.cos(a) * r * 1.15;
        const z = Math.sin(a) * r;
        if (extra.river && Math.abs(x) < RIVER_HALF + 2) continue;
        if (landmarks.some(([lx, lz]) => Math.hypot(x - lx, z - lz) < 9)) continue;
        const w = 4 + seeded(i + 21) * 3;
        const h = 4 + seeded(i + 33) * 6;
        const block = addMesh(root, new THREE.BoxGeometry(w, h, 4 + seeded(i + 44) * 3), std(blockColors[i % blockColors.length], { roughness: 0.85 }), x, h / 2, z);
        block.rotation.y = -a;
        block.castShadow = false;
    }

    // Ordinary glass towers further away (not on the river and not on the famous buildings)
    for (let i = 0; i < 26; i++) {
        const a = (i / 26) * Math.PI * 2 + seeded(i) * 0.2;
        const r = 40 + seeded(i + 50) * 30;
        const x = Math.cos(a) * r;
        const z = Math.sin(a) * r;
        if (extra.river && Math.abs(x) < 18) continue;
        if (landmarks.some(([lx, lz]) => Math.hypot(x - lx, z - lz) < 10)) continue;
        tower(root, x, z, 5 + seeded(i + 7) * 4, 10 + seeded(i + 3) * 24, 5 + seeded(i + 9) * 4, glass[i % 3]);
    }
}

// ---------- Street furniture ----------

export function buildStreetLamp(env, x, z) {
    const g = group(env, x, z);
    const pole = std(0x2f3e36, { metalness: 0.5, roughness: 0.4 });
    addMesh(g, new THREE.CylinderGeometry(0.08, 0.12, 4.4, 8), pole, 0, 2.2, 0);
    addMesh(g, new THREE.CylinderGeometry(0.3, 0.15, 0.5, 6), pole, 0, 4.6, 0);
    addMesh(g, new THREE.SphereGeometry(0.2, 10, 8), new THREE.MeshBasicMaterial({ color: 0xfff3d0 }), 0, 4.45, 0).castShadow = false;
    env.addCollider(x, z, 0.4, 0.4);
}

export function buildBench(env, x, z, rotY = 0) {
    const g = group(env, x, z, rotY);
    const wood = std(0x9c6b3e, { roughness: 0.8 });
    const metal = std(0x2f3542, { metalness: 0.6, roughness: 0.4 });
    [-0.9, 0.9].forEach(sx => {
        addMesh(g, new THREE.BoxGeometry(0.08, 0.5, 0.6), metal, sx, 0.25, 0);
        addMesh(g, new THREE.BoxGeometry(0.08, 0.6, 0.08), metal, sx, 0.75, -0.28);
    });
    [-0.18, 0, 0.18].forEach(sz => addMesh(g, new THREE.BoxGeometry(2.1, 0.06, 0.15), wood, 0, 0.52, sz));
    [0.75, 0.95].forEach(sy => addMesh(g, new THREE.BoxGeometry(2.1, 0.12, 0.05), wood, 0, sy, -0.3));
    env.addRotatedCollider(x, z, 2.2, 0.8, rotY);
}

// A Dutch bicycle (wheels along z)
function bike(parent, x, color) {
    const g = new THREE.Group();
    g.position.x = x;
    parent.add(g);
    const tire = std(0x1e1e1e, { roughness: 0.8 });
    const frame = std(color, { metalness: 0.4, roughness: 0.4 });
    [-0.55, 0.55].forEach(z => {
        const wheel = addMesh(g, new THREE.TorusGeometry(0.38, 0.04, 6, 20), tire, 0, 0.4, z);
        wheel.rotation.y = Math.PI / 2;
    });
    const back = new THREE.Vector3(0, 0.4, -0.55);
    const front = new THREE.Vector3(0, 0.4, 0.55);
    const seat = new THREE.Vector3(0, 0.9, -0.2);
    const head = new THREE.Vector3(0, 1.0, 0.45);
    const pedal = new THREE.Vector3(0, 0.42, 0);
    [[back, seat], [seat, pedal], [pedal, back], [pedal, head], [head, front], [seat, head]].forEach(([a, b]) => beam(g, a, b, 0.03, frame, 0.03, 5));
    addMesh(g, new THREE.BoxGeometry(0.16, 0.06, 0.28), std(0x2d1e14), 0, 0.95, -0.22);
    addMesh(g, new THREE.BoxGeometry(0.6, 0.04, 0.04), frame, 0, 1.08, 0.42);
    // A basket on the front of some bikes
    if (color !== 0x1e1e1e) addMesh(g, new THREE.BoxGeometry(0.35, 0.25, 0.3), std(0xb08850, { roughness: 0.9 }), 0, 0.95, 0.7);
}

export function buildBikeRack(env, x, z, rotY = 0) {
    const g = group(env, x, z, rotY);
    const metal = std(0xb2bec3, { metalness: 0.7, roughness: 0.3 });
    addMesh(g, new THREE.BoxGeometry(3.4, 0.06, 0.06), metal, 0, 0.35, 0);
    const colors = [0x1e1e1e, 0xd63031, 0x1e1e1e, 0x0984e3, 0x6ab04c];
    colors.forEach((c, i) => bike(g, -1.4 + i * 0.7, c));
    env.addRotatedCollider(x, z, 3.6, 2.0, rotY);
}

// The herring cart: Dutch people eat raw herring with onions
export function buildHaringCart(env, x, z, rotY = 0) {
    const g = group(env, x, z, rotY);
    addMesh(g, new THREE.BoxGeometry(2.4, 1.1, 1.3), std(0xf5f6fa, { roughness: 0.5 }), 0, 0.75, 0);
    addMesh(g, new THREE.BoxGeometry(2.42, 0.2, 1.32), std(0x1e4fa3), 0, 0.3, 0);
    [-0.9, 0.9].forEach(sx => {
        const wheel = addMesh(g, new THREE.CylinderGeometry(0.3, 0.3, 0.1, 14), std(0x2d3436), sx, 0.3, 0.7);
        wheel.rotation.x = Math.PI / 2;
    });
    // Herrings on ice
    addMesh(g, new THREE.BoxGeometry(2.1, 0.05, 1.0), std(0xe8f8ff, { roughness: 0.2 }), 0, 1.33, 0);
    for (let i = 0; i < 6; i++) {
        const fish = addMesh(g, new THREE.SphereGeometry(0.12, 8, 6), std(0xb0bcc6, { metalness: 0.6, roughness: 0.3 }), -0.8 + i * 0.32, 1.4, 0.1 * (i % 2));
        fish.scale.set(2.2, 0.6, 0.8);
    }
    // Striped awning on poles and a sign with the Dutch flag colors
    [-1.1, 1.1].forEach(sx => addMesh(g, new THREE.CylinderGeometry(0.04, 0.04, 1.4), std(0xdfe6e9), sx, 1.95, -0.55));
    for (let i = 0; i < 6; i++) {
        addMesh(g, new THREE.BoxGeometry(0.42, 0.05, 1.6), std(i % 2 ? 0xffffff : 0x1e4fa3), -1.05 + i * 0.42, 2.65, 0.1).rotation.x = 0.2;
    }
    addSign(g, 'HARING', 1.8, 0, 2.95, -0.4, '#c0392b');
    env.addRotatedCollider(x, z, 2.6, 1.6, rotY);
}

// ---------- Cube Houses (Kubuswoningen) ----------

// A yellow cube house standing on its corner on top of a hexagonal pillar. The cat walks under it.
export function buildCubeHouse(env, x, z, rotY = 0) {
    const g = group(env, x, z, rotY);
    const pillarH = 3.2;
    const size = 4.6;
    // Hexagonal pillar turned so a flat side (with the front door) faces +z
    addMesh(g, new THREE.CylinderGeometry(0.9, 0.9, pillarH, 6), std(0xe8e2d6, { roughness: 0.8 }), 0, pillarH / 2, 0).rotation.y = Math.PI / 6;
    addMesh(g, new THREE.BoxGeometry(0.6, 1.5, 0.06), std(0x6d4c41), 0, 0.75, 0.79);
    const cube = addMesh(g, new THREE.BoxGeometry(size, size, size), new THREE.MeshStandardMaterial({ map: createCubeFacadeTexture(), roughness: 0.6 }), 0, pillarH + (size * Math.sqrt(3)) / 2, 0);
    cube.quaternion.setFromUnitVectors(new THREE.Vector3(1, 1, 1).normalize(), new THREE.Vector3(0, 1, 0));
    env.overheads.push(cube); // hidden in the top-down view, it would cover the square
    env.addCollider(x, z, 1.8, 1.8);
}

// "Het Potlood" (the Pencil): a tower with a pointy slate roof next to the cube houses
export function buildPencilTower(env, x, z) {
    const g = group(env, x, z);
    const body = addMesh(g, scaleUV(new THREE.CylinderGeometry(2, 2, 15, 6), 3, 4), new THREE.MeshStandardMaterial({ map: createGlassFacadeTexture('#9fb4c4'), roughness: 0.4 }), 0, 7.5, 0);
    body.castShadow = true;
    addMesh(g, new THREE.CylinderGeometry(0, 2.15, 8, 6), std(0x3d4a5c, { roughness: 0.6 }), 0, 19, 0);
    env.addCollider(x, z, 4, 4);
}

// ---------- Markthal ----------

/**
 * The Markthal: a huge arch over the market with the fruit-and-flower painting
 * on the inside, and glass walls with a net of cables at both ends.
 */
export function buildMarkthalArch(env) {
    const root = env.roomGroup;
    const radius = env.roomDepth / 2;
    const mural = createMarkthalMuralTexture();
    const arch = new THREE.Mesh(
        new THREE.CylinderGeometry(radius, radius, env.roomWidth, 64, 1, true, 0, Math.PI),
        // Only the inside is drawn, so the top-down camera looks straight through the roof
        new THREE.MeshStandardMaterial({ map: mural, emissive: 0xffffff, emissiveMap: mural, emissiveIntensity: 0.35, roughness: 0.7, side: THREE.BackSide })
    );
    arch.rotation.z = Math.PI / 2;
    root.add(arch);

    const glassMat = new THREE.MeshStandardMaterial({ color: 0xcfe8f5, transparent: true, opacity: 0.22, roughness: 0.05, metalness: 0.3, side: THREE.DoubleSide, depthWrite: false });
    const netMat = new THREE.LineBasicMaterial({ color: 0x57606f });
    [-1, 1].forEach(side => {
        const x = side * env.roomWidth / 2;
        const glass = new THREE.Mesh(new THREE.CircleGeometry(radius, 48, 0, Math.PI), glassMat);
        glass.position.x = x;
        glass.rotation.y = Math.PI / 2;
        root.add(glass);
        // Cable net: lines across and up, clipped to the arch
        const pts = [];
        for (let z = -radius + 1.5; z < radius; z += 1.5) {
            const h = Math.sqrt(radius * radius - z * z);
            pts.push(new THREE.Vector3(x, 0, z), new THREE.Vector3(x, h, z));
        }
        for (let y = 1.5; y < radius; y += 1.5) {
            const w = Math.sqrt(radius * radius - y * y);
            pts.push(new THREE.Vector3(x, y, -w), new THREE.Vector3(x, y, w));
        }
        root.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), netMat));
        const rim = addMesh(root, new THREE.TorusGeometry(radius, 0.18, 6, 48, Math.PI), std(0x57606f, { metalness: 0.6 }), x, 0, 0);
        rim.rotation.y = Math.PI / 2;
        rim.castShadow = false;
    });
}

// A market stall with a striped awning. goods: cheese, flowers, fish, stroopwafels or fruit
const STALLS = {
    cheese: { sign: 'KAAS', stripe: 0xf9ca24 },
    flowers: { sign: 'BLOEMEN', stripe: 0xe84393 },
    fish: { sign: 'VIS', stripe: 0x0984e3 },
    stroopwafels: { sign: 'STROOPWAFELS', stripe: 0xb9773a },
    fruit: { sign: 'FRUIT', stripe: 0x27ae60 }
};

export function buildMarketStall(env, x, z, goods = 'fruit', rotY = 0) {
    const kind = STALLS[goods] ? goods : 'fruit';
    const g = group(env, x, z, rotY);
    addMesh(g, new THREE.BoxGeometry(3.6, 1.0, 1.6), std(0x8d6e63, { roughness: 0.85 }), 0, 0.5, 0);
    addMesh(g, new THREE.BoxGeometry(3.7, 0.08, 1.7), std(0xd7ccc8), 0, 1.04, 0);
    [[-1.75, -0.75], [1.75, -0.75], [-1.75, 0.75], [1.75, 0.75]].forEach(([px, pz]) => {
        addMesh(g, new THREE.CylinderGeometry(0.05, 0.05, 2.6), std(0xdfe6e9, { metalness: 0.5 }), px, 1.3, pz);
    });
    for (let i = 0; i < 8; i++) {
        const slat = addMesh(g, new THREE.BoxGeometry(0.47, 0.05, 2.2), std(i % 2 ? 0xffffff : STALLS[kind].stripe), -1.65 + i * 0.47, 2.7, 0.1);
        slat.rotation.x = -0.18;
    }
    addSign(g, STALLS[kind].sign, 2.2, 0, 3.2, -0.6, '#2d3436', '#ffd32a');

    const top = 1.1;
    if (kind === 'cheese') {
        // Gouda wheels, a few cut open
        for (let i = 0; i < 6; i++) {
            const wheel = addMesh(g, new THREE.CylinderGeometry(0.32, 0.32, 0.22, 16), std(i % 3 ? 0xf1c40f : 0xe67e22, { roughness: 0.5 }), -1.3 + (i % 3) * 1.3, top + 0.11 + Math.floor(i / 3) * 0.22, 0.2 - Math.floor(i / 3) * 0.4);
            wheel.castShadow = true;
        }
    } else if (kind === 'flowers') {
        // Buckets of tulips
        [0xe84393, 0xff7675, 0xfdcb6e, 0xffffff, 0x6c5ce7].forEach((c, i) => {
            const bx = -1.4 + i * 0.7;
            addMesh(g, new THREE.CylinderGeometry(0.25, 0.2, 0.4, 10), std(0x636e72, { metalness: 0.5 }), bx, top + 0.2, 0);
            for (let f = 0; f < 5; f++) {
                const fx = bx + Math.cos(f * 1.3) * 0.12;
                const fz = Math.sin(f * 1.3) * 0.12;
                addMesh(g, new THREE.CylinderGeometry(0.015, 0.015, 0.5), std(0x2e8b57), fx, top + 0.6, fz);
                addMesh(g, new THREE.SphereGeometry(0.07, 8, 6), std(c), fx, top + 0.87, fz).scale.y = 1.4;
            }
        });
    } else if (kind === 'fish') {
        addMesh(g, new THREE.BoxGeometry(3.3, 0.08, 1.3), std(0xe8f8ff, { roughness: 0.2 }), 0, top + 0.04, 0);
        for (let i = 0; i < 10; i++) {
            const fish = addMesh(g, new THREE.SphereGeometry(0.14, 8, 6), std(i % 3 ? 0xb0bcc6 : 0xff7f50, { metalness: 0.5, roughness: 0.3 }), -1.4 + (i % 5) * 0.7, top + 0.16, i < 5 ? -0.3 : 0.3);
            fish.scale.set(2.4, 0.6, 0.8);
        }
    } else if (kind === 'stroopwafels') {
        for (let s = 0; s < 5; s++) {
            for (let i = 0; i < 4 + (s % 3); i++) {
                addMesh(g, new THREE.CylinderGeometry(0.22, 0.22, 0.05, 16), std(0xc68642, { roughness: 0.7 }), -1.3 + s * 0.65, top + 0.03 + i * 0.055, 0);
            }
        }
    } else {
        const colors = [0xff9f43, 0xd63031, 0xfeca57, 0x6ab04c];
        colors.forEach((c, i) => {
            for (let f = 0; f < 6; f++) {
                addMesh(g, new THREE.SphereGeometry(0.13, 8, 6), std(c, { roughness: 0.5 }), -1.3 + i * 0.85 + (f % 3) * 0.2, top + 0.13 + Math.floor(f / 3) * 0.15, -0.2 + Math.floor(f / 3) * 0.3);
            }
        });
    }
    env.addRotatedCollider(x, z, 3.8, 1.8, rotY);
}

// ---------- Container harbour ----------

const CONTAINER_COLORS = [0x4aa3df, 0xc0392b, 0x27ae60, 0xe67e22, 0x7f8c8d, 0xf1c40f, 0xdfe6e9, 0x1e3799, 0x8e44ad];

// All containers share one geometry, one texture and one material per color
const containerGeometry = new THREE.BoxGeometry(6, 2.5, 2.4);
const containerMaterials = new Map();
let containerTexture = null;

function containerMaterial(color) {
    if (!containerTexture) containerTexture = createContainerTexture();
    if (!containerMaterials.has(color)) containerMaterials.set(color, new THREE.MeshStandardMaterial({ map: containerTexture, color, roughness: 0.6, metalness: 0.2 }));
    return containerMaterials.get(color);
}

function container(parent, color, x, y, z, doorBars = true) {
    const box = addMesh(parent, containerGeometry, containerMaterial(color), x, y + 1.25, z);
    // Door bars on the ends
    if (doorBars) {
        const bar = std(0x2d3436, { metalness: 0.6 });
        [-0.6, 0.6].forEach(dz => addMesh(parent, new THREE.BoxGeometry(0.06, 2.2, 0.06), bar, x + 3.02, y + 1.25, z + dz));
    }
    return box;
}

// Shipping containers stacked `levels` high and `rows` wide
export function buildContainerStack(env, x, z, rotY = 0, levels = 2, rows = 2) {
    const g = group(env, x, z, rotY);
    for (let r = 0; r < rows; r++) {
        const height = Math.max(1, levels - (seeded(x * 3 + z * 7 + r) > 0.7 ? 1 : 0));
        for (let l = 0; l < height; l++) {
            const color = CONTAINER_COLORS[Math.floor(seeded(x + z * 13 + r * 5 + l * 11) * CONTAINER_COLORS.length)];
            container(g, color, 0, l * 2.5, (r - (rows - 1) / 2) * 2.45);
        }
    }
    env.addRotatedCollider(x, z, 6.2, rows * 2.45 + 0.1, rotY);
}

// A ship-to-shore crane: four legs (the cat runs between them) and a long boom out over the water.
// Its trolley rides back and forth along the boom with a container hanging under it.
export function buildGantryCrane(env, x, z) {
    const g = group(env, x, z);
    const blue = std(0x2e86de, { metalness: 0.4, roughness: 0.4 });
    const white = std(0xf5f6fa, { metalness: 0.3, roughness: 0.4 });
    const legs = [[-4.5, -2.5], [4.5, -2.5], [-4.5, 2.5], [4.5, 2.5]];
    legs.forEach(([lx, lz]) => {
        addMesh(g, new THREE.BoxGeometry(0.7, 12, 0.7), blue, lx, 6, lz);
        addMesh(g, new THREE.BoxGeometry(1.0, 0.5, 1.4), std(0x2d3436), lx, 0.25, lz);
        env.addCollider(x + lx, z + lz, 1.0, 1.4);
    });
    [-4.5, 4.5].forEach(lx => {
        addMesh(g, new THREE.BoxGeometry(0.5, 0.5, 5.7), blue, lx, 9, 0);
        beam(g, new THREE.Vector3(lx, 3, -2.5), new THREE.Vector3(lx, 9, 2.5), 0.15, blue);
    });
    [-2.5, 2.5].forEach(lz => addMesh(g, new THREE.BoxGeometry(9.7, 0.6, 0.6), blue, 0, 12, lz));
    // The boom from behind the crane far out over the water (+z), held by cables from the A-frame
    addMesh(g, new THREE.BoxGeometry(2.2, 0.9, 34), white, 0, 13, 9);
    addMesh(g, new THREE.BoxGeometry(2.4, 1.6, 2.2), white, 0, 14.2, -1);
    [-1, 1].forEach(side => {
        beam(g, new THREE.Vector3(side * 4.5, 12, -2.5), new THREE.Vector3(side * 0.5, 20, 0), 0.25, blue);
        beam(g, new THREE.Vector3(side * 4.5, 12, 2.5), new THREE.Vector3(side * 0.5, 20, 0), 0.25, blue);
        beam(g, new THREE.Vector3(side * 0.5, 20, 0), new THREE.Vector3(side * 0.8, 13.4, 25), 0.05, std(0x2d3436), 0.05, 5).castShadow = false;
        beam(g, new THREE.Vector3(side * 0.5, 20, 0), new THREE.Vector3(side * 0.8, 13.4, -7), 0.05, std(0x2d3436), 0.05, 5).castShadow = false;
    });
    const trolley = new THREE.Group();
    g.add(trolley);
    addMesh(trolley, new THREE.BoxGeometry(2.4, 0.8, 2), std(0xf9ca24), 0, 12.2, 0);
    const cable = addMesh(trolley, new THREE.CylinderGeometry(0.04, 0.04, 4.6), std(0x2d3436), 0, 9.6, 0);
    cable.castShadow = false;
    // The spreader holding a container (turned across the boom)
    const load = new THREE.Group();
    load.rotation.y = Math.PI / 2;
    trolley.add(load);
    addMesh(load, new THREE.BoxGeometry(6.2, 0.3, 2.6), std(0xf9ca24), 0, 7.35, 0);
    container(load, 0xc0392b, 0, 4.7, 0);
    env.animate((dt, t) => { trolley.position.z = 10 + Math.sin(t * 0.35) * 9; });
}

// A big container ship moored along the quay (outside the room, just to look at)
export function buildContainerShip(env, x, z) {
    const g = group(env, x, z);
    addMesh(g, new THREE.BoxGeometry(58, 4.2, 10), std(0x1e3799, { roughness: 0.5 }), 0, 0.9, 0);
    addMesh(g, new THREE.BoxGeometry(58.2, 1.0, 10.2), std(0xb33939), 0, -0.9, 0);
    addMesh(g, new THREE.BoxGeometry(58.3, 0.3, 10.3), std(0xffffff), 0, 3.0, 0);
    // Pointed bow: a box turned on its corner, half of it inside the hull
    const bow = new THREE.Group();
    bow.position.set(-29, 0, 0);
    bow.scale.x = 0.8;
    g.add(bow);
    addMesh(bow, new THREE.BoxGeometry(7.07, 5.2, 7.07), std(0x1e3799, { roughness: 0.5 }), 0, 0.4, 0).rotation.y = Math.PI / 4;
    // The bridge (where the captain steers) with a funnel behind it
    addMesh(g, new THREE.BoxGeometry(6, 9, 10), std(0xf5f6fa), 22, 7.5, 0);
    addMesh(g, new THREE.BoxGeometry(6.2, 1, 10.2), std(0x2f3542, { roughness: 0.2, metalness: 0.5 }), 22, 10.6, 0);
    addMesh(g, new THREE.BoxGeometry(2.4, 4, 3), std(0xe67e22), 26, 11, 0);
    for (let col = 0; col < 6; col++) {
        for (let row = 0; row < 3; row++) {
            const height = 1 + Math.floor(seeded(col * 3 + row) * 4);
            for (let l = 0; l < height; l++) {
                const color = CONTAINER_COLORS[Math.floor(seeded(col * 7 + row * 3 + l * 13) * CONTAINER_COLORS.length)];
                container(g, color, -22 + col * 6.4, 3.15 + l * 2.5, (row - 1) * 2.6, false).castShadow = false;
            }
        }
    }
}

export function buildBollard(env, x, z) {
    const g = group(env, x, z);
    const iron = std(0x2d3436, { metalness: 0.6, roughness: 0.4 });
    addMesh(g, new THREE.CylinderGeometry(0.25, 0.3, 0.6, 12), iron, 0, 0.3, 0);
    addMesh(g, new THREE.CylinderGeometry(0.38, 0.3, 0.15, 12), iron, 0, 0.65, 0);
    env.addCollider(x, z, 0.7, 0.7);
}

// Wind turbines on the dike far away, slowly turning
export function buildWindTurbines(env) {
    const white = std(0xf5f6fa, { roughness: 0.5 });
    const rotors = [];
    [[-70, 60], [-45, 70], [-20, 75], [10, 75], [40, 70], [70, 60], [-85, -30], [85, -20]].forEach(([x, z], i) => {
        const g = new THREE.Group();
        g.position.set(x, 0, z);
        g.lookAt(0, 0, 0);
        env.roomGroup.add(g);
        addMesh(g, new THREE.CylinderGeometry(0.5, 0.9, 30, 10), white, 0, 15, 0).castShadow = false;
        addMesh(g, new THREE.BoxGeometry(1.2, 1.2, 3), white, 0, 30, 0).castShadow = false;
        const rotor = new THREE.Group();
        rotor.position.set(0, 30, 1.6);
        g.add(rotor);
        for (let b = 0; b < 3; b++) {
            const blade = addMesh(rotor, new THREE.BoxGeometry(0.6, 12, 0.15), white, 0, 6, 0);
            blade.castShadow = false;
            const holder = new THREE.Group();
            holder.rotation.z = (b / 3) * Math.PI * 2;
            holder.add(blade);
            rotor.add(holder);
        }
        rotors.push({ rotor, speed: 0.5 + (i % 3) * 0.12 });
    });
    env.animate(dt => rotors.forEach(r => { r.rotor.rotation.z += dt * r.speed; }));
}
