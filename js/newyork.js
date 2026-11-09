import * as THREE from 'three';
import { setMaterialHSL } from './graphics.js';
import {
    createBillboardTexture, createTickerTexture, createGlassFacadeTexture, createWaterTexture
} from './textures.js';
import { std, addMesh, beam, group, addSign, addRailing, seeded, tower } from './buildkit.js';

// Props and scenery of the New York endless world (endless_newyork.json):
// Times Square with its red steps, Central Park with the Bow Bridge,
// a subway station and Liberty Island. Every builder takes the LevelEnvironment first.

// ---------- Skyline ----------

/**
 * Skyscrapers around the room with the famous ones: the Empire State Building,
 * the Chrysler Building and One World Trade Center.
 * water: Liberty Island, Manhattan is only across the water to the north.
 * ground: a street floor outside the walls.
 */
export function buildNycSkyline(env, extra = {}) {
    const root = env.roomGroup;
    if (extra.ground) {
        const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), std(0x6f7175, { roughness: 1 }));
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.03;
        root.add(ground);
    }
    // Liberty Island looks at Manhattan across the water: everything is further away and to the north
    const far = extra.water ? 1.6 : 1;
    const shift = extra.water ? -40 : 0;
    const glass = [createGlassFacadeTexture('#7fa7c9'), createGlassFacadeTexture('#a8b8c8'), createGlassFacadeTexture('#c9b48a')];
    const stone = std(0xd8cdb8, { roughness: 0.7 });

    // Empire State Building: stepped tower with the famous spire
    const empire = new THREE.Group();
    empire.position.set(-30 * far, 0, -50 * far + shift);
    root.add(empire);
    [[12, 26, 12], [9, 18, 9], [6, 8, 6], [4, 4, 4]].reduce((y, [w, h, d]) => {
        tower(empire, 0, 0, w, h, d, glass[2], y);
        return y + h;
    }, 0);
    addMesh(empire, new THREE.CylinderGeometry(1.2, 1.6, 4, 8), stone, 0, 58, 0);
    addMesh(empire, new THREE.CylinderGeometry(0.15, 0.6, 8, 8), std(0xdfe6e9, { metalness: 0.6 }), 0, 64, 0);

    // Chrysler Building: shiny crown of arches with a needle on top
    const chrysler = new THREE.Group();
    chrysler.position.set(12 * far, 0, -58 * far + shift);
    root.add(chrysler);
    tower(chrysler, 0, 0, 8, 36, 8, glass[1]);
    tower(chrysler, 0, 0, 6, 8, 6, glass[1], 36);
    const steel = std(0xe8eef2, { metalness: 0.9, roughness: 0.2 });
    for (let i = 0; i < 4; i++) {
        addMesh(chrysler, new THREE.CylinderGeometry(2.6 - i * 0.6, 3 - i * 0.6, 2.4, 12), steel, 0, 45 + i * 2.4, 0);
    }
    addMesh(chrysler, new THREE.ConeGeometry(0.9, 6, 12), steel, 0, 57, 0);
    addMesh(chrysler, new THREE.CylinderGeometry(0.05, 0.12, 6, 6), steel, 0, 63, 0);

    // One World Trade Center: a tall glass tower that gets thinner towards the top
    const wtc = new THREE.Group();
    wtc.position.set(40 * far, 0, -36 * far + shift);
    root.add(wtc);
    const body = addMesh(wtc, new THREE.CylinderGeometry(3.2, 6.4, 64, 4, 1), new THREE.MeshStandardMaterial({ map: glass[0], roughness: 0.2, metalness: 0.6 }), 0, 32, 0);
    body.rotation.y = Math.PI / 4;
    body.castShadow = false;
    addMesh(wtc, new THREE.CylinderGeometry(0.15, 0.4, 14, 6), std(0xdfe6e9, { metalness: 0.6 }), 0, 71, 0);

    // Lots of other skyscrapers and older blocks
    const landmarks = [[empire.position.x, empire.position.z], [chrysler.position.x, chrysler.position.z], [wtc.position.x, wtc.position.z]];
    const blockColors = [0x8a5a44, 0xa9876a, 0x6f4e3d, 0xb9a48a, 0x9aa5ad];
    for (let i = 0; i < 44; i++) {
        const a = (i / 44) * Math.PI * 2 + seeded(i) * 0.15;
        if (extra.water && Math.sin(a) > -0.35) continue; // only the Manhattan side
        const r = (extra.water ? 70 : 30) + seeded(i + 50) * (extra.water ? 30 : 40);
        const x = Math.cos(a) * r * 1.2;
        const z = Math.sin(a) * r + (extra.water ? 0 : 0);
        if (landmarks.some(([lx, lz]) => Math.hypot(x - lx, z - lz) < 10)) continue;
        if (i % 3 === 0) {
            const h = 8 + seeded(i + 3) * 10;
            const block = addMesh(root, new THREE.BoxGeometry(7, h, 7), std(blockColors[i % blockColors.length], { roughness: 0.85 }), x, h / 2, z);
            block.castShadow = false;
            // Water tower on the roof
            addMesh(root, new THREE.CylinderGeometry(0.8, 0.8, 1.6, 10), std(0x8d6e63), x + 1.5, h + 1.6, z).castShadow = false;
            addMesh(root, new THREE.ConeGeometry(0.9, 0.8, 10), std(0x5d4037), x + 1.5, h + 2.8, z).castShadow = false;
        } else {
            tower(root, x, z, 5 + seeded(i + 7) * 5, 18 + seeded(i + 3) * 34, 5 + seeded(i + 9) * 5, glass[i % 3]);
        }
    }
}

// ---------- Street furniture ----------

// A yellow taxi cab (parked, lengthwise along x)
export function buildTaxi(env, x, z, rotY = 0) {
    const g = group(env, x, z, rotY);
    const yellow = std(0xf7b500, { roughness: 0.35, metalness: 0.3 });
    addMesh(g, new THREE.BoxGeometry(4.2, 0.8, 1.8), yellow, 0, 0.7, 0);
    addMesh(g, new THREE.BoxGeometry(2.3, 0.7, 1.7), yellow, -0.2, 1.45, 0);
    addMesh(g, new THREE.BoxGeometry(2.35, 0.5, 1.72), std(0x2f3e4f, { roughness: 0.1, metalness: 0.6 }), -0.2, 1.45, 0);
    addMesh(g, new THREE.BoxGeometry(4.22, 0.12, 1.82), std(0x1e1e1e), 0, 0.85, 0); // checker stripe
    addMesh(g, new THREE.BoxGeometry(0.7, 0.3, 0.3), std(0xffffff, { emissive: 0xfff3b0, emissiveIntensity: 0.4 }), -0.2, 1.95, 0);
    [[-1.4, -0.9], [1.4, -0.9], [-1.4, 0.9], [1.4, 0.9]].forEach(([wx, wz]) => {
        addMesh(g, new THREE.CylinderGeometry(0.38, 0.38, 0.25, 14), std(0x1e1e1e), wx, 0.38, wz).rotation.x = Math.PI / 2;
    });
    [-0.6, 0.6].forEach(wz => addMesh(g, new THREE.BoxGeometry(0.06, 0.2, 0.35), new THREE.MeshBasicMaterial({ color: 0xfff6d5 }), 2.12, 0.8, wz));
    env.addRotatedCollider(x, z, 4.4, 2.0, rotY);
    return g;
}

// Hot dog cart with a striped umbrella
export function buildHotDogCart(env, x, z, rotY = 0) {
    const g = group(env, x, z, rotY);
    addMesh(g, new THREE.BoxGeometry(2.2, 1.0, 1.2), std(0xdfe6e9, { metalness: 0.7, roughness: 0.3 }), 0, 0.8, 0);
    [-0.8, 0.8].forEach(wx => {
        addMesh(g, new THREE.CylinderGeometry(0.3, 0.3, 0.1, 14), std(0x2d3436), wx, 0.3, 0.65).rotation.x = Math.PI / 2;
    });
    // Hot dogs on the grill
    for (let i = 0; i < 5; i++) {
        const dog = addMesh(g, new THREE.CylinderGeometry(0.06, 0.06, 0.5, 8), std(0xc0392b, { roughness: 0.5 }), -0.6 + i * 0.3, 1.36, 0);
        dog.rotation.x = Math.PI / 2;
        addMesh(g, new THREE.BoxGeometry(0.16, 0.08, 0.45), std(0xe1b07e), -0.6 + i * 0.3, 1.32, 0);
    }
    addMesh(g, new THREE.CylinderGeometry(0.04, 0.04, 2.0), std(0xdfe6e9), 0, 2.2, 0);
    for (let i = 0; i < 8; i++) {
        const slice = addMesh(g, new THREE.ConeGeometry(1.4, 0.6, 8, 1, true, (i / 8) * Math.PI * 2, Math.PI / 4), std(i % 2 ? 0xffffff : 0x0984e3, { side: THREE.DoubleSide }), 0, 3.3, 0);
        slice.castShadow = false;
    }
    addSign(g, 'HOT DOGS', 1.8, 0, 1.6, 0.62, '#c0392b');
    env.addRotatedCollider(x, z, 2.4, 1.4, rotY);
}

export function buildFireHydrant(env, x, z) {
    const g = group(env, x, z);
    const red = std(0xc0392b, { roughness: 0.4 });
    addMesh(g, new THREE.CylinderGeometry(0.22, 0.26, 0.8, 12), red, 0, 0.4, 0);
    addMesh(g, new THREE.SphereGeometry(0.23, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), red, 0, 0.8, 0);
    addMesh(g, new THREE.CylinderGeometry(0.08, 0.08, 0.6, 8), red, 0, 0.55, 0).rotation.z = Math.PI / 2;
    env.addCollider(x, z, 0.6, 0.6);
}

// ---------- Times Square ----------

// The red glass steps (TKTS) against the north wall: the cat and mice can climb them
const STEPS_HALF_WIDTH = 5;
const STEPS_FRONT = -5;   // z where the steps start
const STEPS_BACK = -12.3; // the top, at the wall
const STEPS_RISE = 2.6;
const STEPS_COUNT = 9;

export function buildRedSteps(env) {
    const run = STEPS_FRONT - STEPS_BACK;
    env.heightFn = (x, z) => (Math.abs(x) < STEPS_HALF_WIDTH + 0.6 && z < STEPS_FRONT
        ? STEPS_RISE * Math.min(1, Math.max(0, (STEPS_FRONT - z) / run)) : 0);
    const stepMat = std(0xe0303a, { roughness: 0.2, emissive: 0x8a0f18, emissiveIntensity: 0.6, transparent: true, opacity: 0.92 });
    const depth = run / STEPS_COUNT;
    for (let i = 0; i < STEPS_COUNT; i++) {
        const h = ((i + 1) / STEPS_COUNT) * STEPS_RISE;
        const step = addMesh(env.roomGroup, new THREE.BoxGeometry(STEPS_HALF_WIDTH * 2, h, depth + 0.02), stepMat, 0, h / 2, STEPS_FRONT - (i + 0.5) * depth);
        step.castShadow = false;
    }
    // Glass side walls, so the steps are only climbed from the front
    const sideMat = std(0xbfe6ff, { roughness: 0.05, transparent: true, opacity: 0.35 });
    [-1, 1].forEach(side => {
        addMesh(env.roomGroup, new THREE.BoxGeometry(0.15, STEPS_RISE + 1, run), sideMat, side * (STEPS_HALF_WIDTH + 0.1), (STEPS_RISE + 1) / 2, (STEPS_FRONT + STEPS_BACK) / 2).castShadow = false;
        env.addCollider(side * (STEPS_HALF_WIDTH + 0.1), (STEPS_FRONT + STEPS_BACK) / 2 - 0.4, 0.3, run - 0.8);
    });
    // The ticket booth sign under the steps
    addSign(env.roomGroup, 'TKTS', 2.4, 0, 0.5, STEPS_FRONT + 0.02, '#c0392b', '#ffffff');
}

// Huge glowing billboards on the buildings around the square, and a news ticker
export function buildTimesSquareBillboards(env) {
    const root = env.roomGroup;
    const hw = env.roomWidth / 2 - 0.05;
    const hd = env.roomDepth / 2 - 0.05;
    const ads = [
        ['VINCENZO', '#e84393', 'THE MICE KILLER'], ['CHEESE', '#f39c12', 'NOW 50% HOLES'], ['MEOW!', '#6c5ce7', ''],
        ['BROKJES', '#00b894', 'CRUNCHY & TASTY'], ['NYC', '#0984e3', 'I ♥ CATS'], ['MOUSE TV', '#d63031', 'TONIGHT 8PM'],
        ['YARN', '#e17055', 'BUY 2 GET 1'], ['TUNA', '#00cec9', 'FRESH FISH'], ['NAP TIME', '#fdcb6e', '']
    ];
    const boards = [
        // [x, y, z, rotY, w, h]
        [-9, 8.5, -hd, 0, 8, 4], [9, 8.5, -hd, 0, 8, 4], [0, 9.2, -hd, 0, 7, 3.5],
        [-hw, 8.2, -7, Math.PI / 2, 8, 4], [-hw, 8.2, 7, Math.PI / 2, 8, 4],
        [hw, 8.2, -7, -Math.PI / 2, 8, 4], [hw, 8.2, 7, -Math.PI / 2, 8, 4],
        [-8, 8.2, hd, Math.PI, 9, 4], [8, 8.2, hd, Math.PI, 9, 4]
    ];
    const mats = [];
    boards.forEach(([x, y, z, rotY, w, h], i) => {
        const [text, bg, sub] = ads[i % ads.length];
        const mat = new THREE.MeshBasicMaterial({ map: createBillboardTexture(text, bg, '#ffffff', sub) });
        const board = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
        board.position.set(x, y, z);
        board.rotation.y = rotY;
        board.translateZ(0.06);
        root.add(board);
        mats.push(mat);
    });
    // The billboards flicker brighter and darker, one after another
    env.animate((dt, t) => mats.forEach((m, i) => {
        const v = 0.8 + 0.2 * Math.sin(t * 2 + i * 1.7);
        m.color.setRGB(v, v, v);
    }));

    // News ticker running along the north wall, above the steps
    const ticker = createTickerTexture('★ BREAKING: VINCENZO SPOTTED IN TIMES SQUARE ★ MICE PANIC ★ CHEESE PRICES UP ★ ');
    ticker.repeat.set(2, 1);
    const band = new THREE.Mesh(new THREE.PlaneGeometry(env.roomWidth, 0.9), new THREE.MeshBasicMaterial({ map: ticker }));
    band.position.set(0, 6.0, -hd + 0.08);
    root.add(band);
    env.animate(dt => { ticker.offset.x += dt * 0.08; });

    // Neon lights along the top of the walls change color
    const neon = new THREE.MeshBasicMaterial({ color: 0xff00aa });
    [[0, -hd + 0.1, 0, env.roomWidth], [0, hd - 0.1, 0, env.roomWidth], [-hw + 0.1, 0, Math.PI / 2, env.roomDepth], [hw - 0.1, 0, Math.PI / 2, env.roomDepth]].forEach(([x, z, rotY, length]) => {
        const tube = addMesh(root, new THREE.BoxGeometry(length, 0.12, 0.12), neon, x, 11.2, z);
        tube.rotation.y = rotY;
        tube.castShadow = false;
    });
    env.animate((dt, t) => setMaterialHSL(neon, (t * 0.1) % 1, 1, 0.55));
}

// ---------- Central Park ----------

// The pond with the cream-colored Bow Bridge across it (along z): the cat walks over the bridge
const POND_HALF_X = 10;
const POND_Z1 = -8;
const POND_Z2 = 3;
const BRIDGE_HALF = 1.6;
const BRIDGE_PEAK = 1.3;

function bowBridgeHeight(z) {
    const mid = (POND_Z1 + POND_Z2) / 2;
    const half = (POND_Z2 - POND_Z1) / 2 + 1;
    const t = (z - mid) / half;
    return Math.abs(t) < 1 ? BRIDGE_PEAK * (1 - t * t) : 0;
}

export function buildBowBridge(env) {
    const root = env.roomGroup;
    const midZ = (POND_Z1 + POND_Z2) / 2;
    const depth = POND_Z2 - POND_Z1;
    env.heightFn = (x, z) => (Math.abs(x) < BRIDGE_HALF + 0.6 ? bowBridgeHeight(z) : 0);

    // The pond with a stone rim, blocked on both sides of the bridge
    const waterTex = createWaterTexture();
    waterTex.repeat.set(3, 2);
    const water = new THREE.Mesh(new THREE.PlaneGeometry(POND_HALF_X * 2, depth), new THREE.MeshStandardMaterial({ map: waterTex, color: 0x7fb59a, roughness: 0.15, metalness: 0.3 }));
    water.rotation.x = -Math.PI / 2;
    water.position.set(0, 0.03, midZ);
    root.add(water);
    env.animate(dt => { waterTex.offset.x += dt * 0.01; });
    const rim = std(0x9a958a, { roughness: 0.9 });
    [[0, POND_Z1, POND_HALF_X * 2 + 0.6, 0.3], [0, POND_Z2, POND_HALF_X * 2 + 0.6, 0.3], [-POND_HALF_X, midZ, 0.3, depth], [POND_HALF_X, midZ, 0.3, depth]].forEach(([x, z, w, d]) => {
        addMesh(root, new THREE.BoxGeometry(w, 0.25, d), rim, x, 0.12, z).castShadow = false;
    });
    [-1, 1].forEach(side => {
        const x = side * (BRIDGE_HALF + POND_HALF_X) / 2;
        env.addCollider(x, midZ, POND_HALF_X - BRIDGE_HALF, depth);
    });

    // The bridge: a curved deck with arched cast-iron sides and railings
    const length = depth + 2;
    const deckGeo = new THREE.PlaneGeometry(BRIDGE_HALF * 2 + 0.3, length, 1, 32).rotateX(-Math.PI / 2);
    const pos = deckGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setY(i, bowBridgeHeight(pos.getZ(i) + midZ) + 0.04);
    deckGeo.computeVertexNormals();
    const deck = new THREE.Mesh(deckGeo, std(0xb08a5a, { roughness: 0.8 }));
    deck.position.z = midZ;
    deck.receiveShadow = true;
    root.add(deck);
    const cream = std(0xf1e6cf, { roughness: 0.5, metalness: 0.3 });
    [-1, 1].forEach(side => {
        const x = side * (BRIDGE_HALF + 0.1);
        // Arched side panel (a flattened ring)
        const archR = depth / 2 + 0.6;
        const arch = addMesh(root, new THREE.TorusGeometry(archR, 0.18, 6, 24, Math.PI), cream, x, 1.15 - archR * 0.85, midZ);
        arch.rotation.y = Math.PI / 2;
        arch.scale.set(1, 0.85, 1);
        const floorY = zz => bowBridgeHeight(zz);
        // addRailing works along x, so build it in a turned group
        const holder = new THREE.Group();
        holder.position.set(x, 0, 0);
        holder.rotation.y = -Math.PI / 2;
        root.add(holder);
        addRailing(holder, new THREE.Vector3(POND_Z1 - 1, 0, 0), new THREE.Vector3(POND_Z2 + 1, 0, 0), cream, 1.0, floorY, 0.8);
    });

    // Ducks paddling around and a rowboat
    const ducks = [];
    for (let i = 0; i < 4; i++) {
        const duck = new THREE.Group();
        addMesh(duck, new THREE.SphereGeometry(0.25, 10, 8), std(i === 0 ? 0xf5f6fa : 0x8d6e63), 0, 0.15, 0).scale.set(1, 0.7, 1.4);
        addMesh(duck, new THREE.SphereGeometry(0.13, 10, 8), std(i === 0 ? 0xf5f6fa : 0x1e8a4a), 0, 0.38, 0.22);
        addMesh(duck, new THREE.ConeGeometry(0.05, 0.14, 6), std(0xf39c12), 0, 0.36, 0.38).rotation.x = Math.PI / 2;
        root.add(duck);
        ducks.push({ duck, side: i % 2 ? 1 : -1, r: 1.5 + i * 0.6, speed: 0.4 + i * 0.1, phase: i * 1.5 });
    }
    const boat = new THREE.Group();
    addMesh(boat, new THREE.BoxGeometry(1.0, 0.35, 2.4), std(0x8d6e63), 0, 0.2, 0);
    addMesh(boat, new THREE.BoxGeometry(0.8, 0.05, 2.2), std(0xd7ccc8), 0, 0.36, 0);
    boat.position.set(-6.5, 0.03, midZ - 2);
    boat.rotation.y = 0.6;
    root.add(boat);
    env.animate((dt, t) => {
        ducks.forEach(d => {
            const a = t * d.speed + d.phase;
            d.duck.position.set(d.side * 6 + Math.cos(a) * d.r, 0.03, midZ + Math.sin(a) * d.r);
            d.duck.rotation.y = -a;
        });
        boat.position.y = 0.03 + Math.sin(t * 1.3) * 0.03;
    });
}

// ---------- Subway station ----------

// Tracks along the north wall (blocked), the yellow platform edge, and a silver train that pulls in and out
export function buildSubwayTracks(env) {
    const root = env.roomGroup;
    const hd = env.roomDepth / 2;
    const edgeZ = -6.5;
    const trackZ = (-hd + edgeZ) / 2;
    env.addCollider(0, trackZ, env.roomWidth, hd + edgeZ);

    const bed = new THREE.Mesh(new THREE.PlaneGeometry(env.roomWidth, hd + edgeZ), std(0x2d2a26, { roughness: 1 }));
    bed.rotation.x = -Math.PI / 2;
    bed.position.set(0, 0.015, trackZ);
    root.add(bed);
    const rail = std(0xb2bec3, { metalness: 0.8, roughness: 0.3 });
    [trackZ - 0.75, trackZ + 0.75].forEach(z => addMesh(root, new THREE.BoxGeometry(env.roomWidth, 0.12, 0.1), rail, 0, 0.08, z).castShadow = false);
    for (let x = -16.5; x < 17; x += 1) addMesh(root, new THREE.BoxGeometry(0.3, 0.06, 2.2), std(0x4e3b2a), x, 0.04, trackZ).castShadow = false;
    const edge = new THREE.Mesh(new THREE.PlaneGeometry(env.roomWidth, 0.6), std(0xf9ca24, { roughness: 0.8 }));
    edge.rotation.x = -Math.PI / 2;
    edge.position.set(0, 0.02, edgeZ + 0.3);
    root.add(edge);

    // The train: three silver cars with windows, doors and the round route sign
    const train = new THREE.Group();
    const silver = std(0xc8d0d6, { metalness: 0.8, roughness: 0.3 });
    const glass = std(0x1e2a36, { roughness: 0.1, metalness: 0.5, emissive: 0x3a4a5a, emissiveIntensity: 0.6 });
    for (let c = 0; c < 3; c++) {
        const car = new THREE.Group();
        car.position.x = c * 11;
        train.add(car);
        addMesh(car, new THREE.BoxGeometry(10.6, 3.2, 2.8), silver, 0, 1.9, 0);
        addMesh(car, new THREE.BoxGeometry(10.62, 0.25, 2.82), std(0x6c5ce7), 0, 1.2, 0);
        for (let w = -4; w <= 4; w += 2) {
            addMesh(car, new THREE.BoxGeometry(1.4, 0.9, 2.84), glass, w, 2.4, 0);
        }
    }
    // Route sign on the front of the first car
    addMesh(train, new THREE.CircleGeometry(0.4, 16), new THREE.MeshBasicMaterial({ color: 0xe84393 }), 22 + 5.31, 2.6, 0).rotation.y = Math.PI / 2;
    train.position.set(-60, 0, trackZ);
    root.add(train);
    // Every 26 seconds: pull in, wait at the platform, pull out again
    const period = 26;
    env.animate((dt, t) => {
        const p = t % period;
        let x;
        if (p < 6) x = -60 + 52 * (1 - Math.pow(1 - p / 6, 2)); // slowing down
        else if (p < 14) x = -8;                               // stopped
        else if (p < 20) x = -8 + 70 * Math.pow((p - 14) / 6, 2); // speeding up
        else x = 200;                                          // gone
        train.position.x = x;
    });
}

// A steel column of the station, with the line numbers on it
export function buildSubwayPillar(env, x, z) {
    const g = group(env, x, z);
    const paint = std(0x2c6e5a, { roughness: 0.5, metalness: 0.4 });
    addMesh(g, new THREE.BoxGeometry(0.5, 6, 0.12), paint, 0, 3, 0);
    addMesh(g, new THREE.BoxGeometry(0.12, 6, 0.5), paint, 0, 3, 0);
    [['1', 0xe74c3c], ['2', 0xe74c3c], ['3', 0xe74c3c]].forEach(([n, c], i) => {
        const disc = addMesh(g, new THREE.CircleGeometry(0.2, 16), new THREE.MeshBasicMaterial({ color: c }), -0.3 + i * 0.3, 2.6, 0.07);
        disc.castShadow = false;
    });
    env.addCollider(x, z, 0.6, 0.6);
}

// A row of turnstiles (count of them, along x)
export function buildTurnstiles(env, x, z, count = 4) {
    const g = group(env, x, z);
    const steel = std(0xb2bec3, { metalness: 0.8, roughness: 0.3 });
    const spacing = 1.8;
    const arms = [];
    for (let i = 0; i < count; i++) {
        const px = (i - (count - 1) / 2) * spacing;
        addMesh(g, new THREE.BoxGeometry(0.4, 1.0, 1.2), steel, px, 0.5, 0);
        const arm = new THREE.Group();
        arm.position.set(px + 0.25, 0.9, 0);
        g.add(arm);
        for (let a = 0; a < 3; a++) {
            const bar = addMesh(arm, new THREE.CylinderGeometry(0.03, 0.03, 0.6), steel, 0.3, 0, 0);
            const holder = new THREE.Group();
            holder.rotation.x = (a / 3) * Math.PI * 2;
            bar.rotation.z = Math.PI / 2;
            holder.add(bar);
            arm.add(holder);
        }
        arms.push(arm);
        env.addCollider(x + px, z, 0.5, 1.3);
    }
    env.animate(dt => arms.forEach((arm, i) => { arm.rotation.x += dt * (0.3 + i * 0.1); }));
}

// ---------- Liberty Island ----------

// The Statue of Liberty on her star-shaped base, torch held high
export function buildStatueOfLiberty(env, x, z) {
    const g = group(env, x, z);
    const granite = std(0xc9bfae, { roughness: 0.8 });
    const copper = std(0x6fb3a0, { roughness: 0.55, metalness: 0.2 });

    // Star-shaped fort under the pedestal (flat, walkable around)
    const star = new THREE.Shape();
    for (let i = 0; i < 22; i++) {
        const r = i % 2 ? 4.2 : 7;
        const a = (i / 22) * Math.PI * 2;
        if (i === 0) star.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else star.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    const starMesh = new THREE.Mesh(new THREE.ShapeGeometry(star), std(0xd8cdb8, { roughness: 0.9 }));
    starMesh.rotation.x = -Math.PI / 2;
    starMesh.position.y = 0.02;
    g.add(starMesh);

    addMesh(g, new THREE.BoxGeometry(6, 1, 6), granite, 0, 0.5, 0);
    addMesh(g, new THREE.BoxGeometry(4.6, 4.6, 4.6), granite, 0, 3.3, 0);
    addMesh(g, new THREE.BoxGeometry(5, 0.5, 5), granite, 0, 5.85, 0);
    env.addCollider(x, z, 6, 6);

    // The statue (facing +z)
    const s = new THREE.Group();
    s.position.y = 6.1;
    g.add(s);
    env.overheads.push(s); // almost as tall as the top-down camera, hidden in that view
    addMesh(s, new THREE.CylinderGeometry(1.0, 1.6, 6.5, 14), copper, 0, 3.25, 0);
    addMesh(s, new THREE.SphereGeometry(1.05, 14, 10), copper, 0, 6.6, 0).scale.y = 0.8;
    addMesh(s, new THREE.SphereGeometry(0.6, 14, 12), copper, 0, 7.6, 0.05);
    for (let i = 0; i < 7; i++) {
        const a = -Math.PI / 2 + ((i - 3) / 3) * 1.2;
        const spike = addMesh(s, new THREE.ConeGeometry(0.1, 0.8, 6), copper, Math.sin(a) * 0.55, 8.15, -Math.cos(a) * 0.55 + 0.05);
        spike.rotation.set(Math.cos(a) * -0.8, 0, Math.sin(a) * -0.8);
    }
    // Right arm up with the torch, left arm holding the tablet
    const shoulder = new THREE.Vector3(0.85, 6.7, 0);
    const hand = new THREE.Vector3(1.3, 10.2, -0.1);
    beam(s, shoulder, hand, 0.32, copper, 0.24);
    addMesh(s, new THREE.CylinderGeometry(0.28, 0.16, 0.7, 10), copper, hand.x, hand.y + 0.4, hand.z);
    addMesh(s, new THREE.CylinderGeometry(0.42, 0.3, 0.2, 12), std(0xc9a34a, { metalness: 0.8, roughness: 0.3 }), hand.x, hand.y + 0.85, hand.z);
    const flame = addMesh(s, new THREE.ConeGeometry(0.32, 0.9, 10), new THREE.MeshBasicMaterial({ color: 0xffc94a }), hand.x, hand.y + 1.4, hand.z);
    flame.castShadow = false;
    beam(s, new THREE.Vector3(-0.85, 6.5, 0), new THREE.Vector3(-1.1, 5.0, 0.6), 0.3, copper, 0.25);
    const tablet = addMesh(s, new THREE.BoxGeometry(0.9, 1.5, 0.25), copper, -1.15, 5.0, 0.75);
    tablet.rotation.z = 0.15;
    env.animate((dt, t) => { flame.scale.set(1 + Math.sin(t * 9) * 0.08, 1 + Math.sin(t * 7) * 0.15, 1); });
}

// A flagpole with the stars and stripes waving
export function buildFlagpole(env, x, z) {
    const g = group(env, x, z);
    addMesh(g, new THREE.CylinderGeometry(0.06, 0.09, 7, 8), std(0xdfe6e9, { metalness: 0.7 }), 0, 3.5, 0);
    addMesh(g, new THREE.SphereGeometry(0.12, 8, 6), std(0xc9a34a, { metalness: 0.8 }), 0, 7.05, 0);
    const flag = new THREE.Group();
    flag.position.set(0, 6.3, 0);
    g.add(flag);
    for (let i = 0; i < 7; i++) {
        addMesh(flag, new THREE.BoxGeometry(2.2, 0.17, 0.02), std(i % 2 ? 0xffffff : 0xc0392b), 1.15, -i * 0.17, 0).castShadow = false;
    }
    addMesh(flag, new THREE.BoxGeometry(0.9, 0.68, 0.03), std(0x1e3799), 0.5, -0.26, 0).castShadow = false;
    env.animate((dt, t) => { flag.rotation.y = Math.sin(t * 1.5) * 0.25; });
    env.addCollider(x, z, 0.4, 0.4);
}

// The Staten Island Ferry (orange) sailing around the island
export function buildFerry(env) {
    const ferry = new THREE.Group();
    addMesh(ferry, new THREE.BoxGeometry(4, 1.4, 12), std(0xf07a20, { roughness: 0.5 }), 0, 0.2, 0);
    addMesh(ferry, new THREE.BoxGeometry(3.6, 1.4, 9), std(0xf07a20), 0, 1.6, 0);
    addMesh(ferry, new THREE.BoxGeometry(3.62, 0.5, 9.02), std(0x2f3e4f, { roughness: 0.1, metalness: 0.5 }), 0, 1.7, 0);
    addMesh(ferry, new THREE.BoxGeometry(2.4, 1.0, 3), std(0xffffff), 0, 2.8, 0);
    env.roomGroup.add(ferry);
    env.animate((dt, t) => {
        const a = t * 0.06;
        ferry.position.set(Math.cos(a) * 34, -0.8, Math.sin(a) * 28);
        ferry.rotation.y = -a;
    });
}
