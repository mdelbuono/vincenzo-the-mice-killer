import * as THREE from 'three';
import { setMaterialHSL } from './graphics.js';
import { createSlotReelTexture, createRouletteTexture, createBillboardTexture } from './textures.js';
import { Cat } from './cat.js';
import { std, addMesh, group, addSign } from './buildkit.js';

// Props of the Brokjes Casino (level 13, casino.json): slot machines, roulette,
// blackjack with a dealer cat, a prize wheel, chandeliers and neon signs.
// Every builder takes the LevelEnvironment first.

const GOLD = 0xc9a34a;

// A row of slot machines side by side (along local x), screens facing local +z.
// Their lights blink and now and then a machine spins its reels.
export function buildSlotRow(env, x, z, rotY = 0, count = 5) {
    const g = group(env, x, z, rotY);
    const spacing = 1.4;
    const machines = [];
    for (let i = 0; i < count; i++) {
        const m = new THREE.Group();
        m.position.x = (i - (count - 1) / 2) * spacing;
        g.add(m);
        const body = std([0xc0392b, 0x8e44ad, 0x2980b9, 0x16a085][i % 4], { roughness: 0.35, metalness: 0.4 });
        addMesh(m, new THREE.BoxGeometry(1.2, 1.2, 0.9), body, 0, 0.6, 0);
        addMesh(m, new THREE.BoxGeometry(1.2, 1.3, 0.7), body, 0, 1.85, -0.1);
        addMesh(m, new THREE.BoxGeometry(1.25, 0.08, 1.0), std(GOLD, { metalness: 0.8, roughness: 0.3 }), 0, 1.22, 0.02);
        // Three reels behind the glass
        const reels = [];
        for (let r = 0; r < 3; r++) {
            const tex = createSlotReelTexture();
            tex.offset.y = Math.random();
            const reel = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.55), new THREE.MeshBasicMaterial({ map: tex }));
            reel.position.set(-0.34 + r * 0.34, 1.95, 0.26);
            m.add(reel);
            reels.push(tex);
        }
        addMesh(m, new THREE.BoxGeometry(1.1, 0.7, 0.04), std(0x111111, { roughness: 0.1, transparent: true, opacity: 0.2 }), 0, 1.95, 0.27).castShadow = false;
        // Blinking light on top and a lever on the side
        const lightMat = new THREE.MeshBasicMaterial({ color: 0xffd32a });
        addMesh(m, new THREE.CylinderGeometry(0.2, 0.2, 0.3, 12), lightMat, 0, 2.65, -0.1).castShadow = false;
        const lever = new THREE.Group();
        lever.position.set(0.66, 1.5, 0.1);
        m.add(lever);
        addMesh(lever, new THREE.CylinderGeometry(0.03, 0.03, 0.6), std(0xdfe6e9, { metalness: 0.8 }), 0, 0.3, 0);
        addMesh(lever, new THREE.SphereGeometry(0.09, 10, 8), std(0xe74c3c), 0, 0.62, 0);
        addMesh(m, new THREE.BoxGeometry(0.6, 0.08, 0.3), std(0x2d3436), 0, 0.9, 0.46); // coin tray
        machines.push({ reels, lightMat, lever, spinUntil: 0, next: Math.random() * 8 });
    }
    env.animate((dt, t) => machines.forEach((m, i) => {
        setMaterialHSL(m.lightMat, ((t * 0.3) + i * 0.15) % 1, 1, 0.55);
        if (t > m.next) {
            m.spinUntil = t + 1.6;
            m.next = t + 5 + Math.random() * 10;
        }
        const spinning = t < m.spinUntil;
        m.reels.forEach((tex, r) => {
            // The reels stop one after another, each on a whole symbol
            if (spinning && t < m.spinUntil - (2 - r) * 0.3) tex.offset.y += dt * (3 + r);
            else tex.offset.y = Math.round(tex.offset.y * 6) / 6;
        });
        m.lever.rotation.x = spinning && t > m.spinUntil - 1.6 && t < m.spinUntil - 1.3 ? 0.8 : 0;
    }));
    env.addRotatedCollider(x, z, count * spacing, 1.1, rotY);
}

// Roulette: a green table with the betting grid, the spinning wheel at one end and stacks of chips
export function buildRouletteTable(env, x, z, rotY = 0) {
    const g = group(env, x, z, rotY);
    const wood = std(0x5d3a1a, { roughness: 0.5 });
    addMesh(g, new THREE.BoxGeometry(5, 0.9, 2.4), wood, 0, 0.45, 0);
    addMesh(g, new THREE.BoxGeometry(4.8, 0.06, 2.2), std(0x1e7a46, { roughness: 0.95 }), 0, 0.93, 0);
    // Betting grid: red and black squares
    for (let col = 0; col < 8; col++) {
        for (let row = 0; row < 3; row++) {
            const sq = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.34), std((col + row) % 2 ? 0xc0392b : 0x1e1e1e, { roughness: 0.9 }));
            sq.rotation.x = -Math.PI / 2;
            sq.position.set(-0.4 + col * 0.38, 0.97, -0.4 + row * 0.38);
            g.add(sq);
        }
    }
    // The wheel spins one way, the ball rolls around the other way
    addMesh(g, new THREE.CylinderGeometry(0.95, 0.85, 0.3, 32), wood, -1.7, 1.08, 0);
    const wheel = new THREE.Mesh(new THREE.CircleGeometry(0.8, 37), new THREE.MeshStandardMaterial({ map: createRouletteTexture(), roughness: 0.4 }));
    wheel.rotation.x = -Math.PI / 2;
    wheel.position.set(-1.7, 1.24, 0);
    g.add(wheel);
    addMesh(g, new THREE.CylinderGeometry(0.06, 0.08, 0.3, 8), std(GOLD, { metalness: 0.8 }), -1.7, 1.38, 0);
    const ball = addMesh(g, new THREE.SphereGeometry(0.06, 10, 8), std(0xffffff, { roughness: 0.2 }), -1.7, 1.3, 0);
    env.animate((dt, t) => {
        wheel.rotation.z = t * 1.2;
        const a = -t * 3;
        const r = 0.55 + Math.sin(t * 0.4) * 0.1;
        ball.position.set(-1.7 + Math.cos(a) * r, 1.3, Math.sin(a) * r);
    });
    addChips(g, 1.6, 0.96, 0.6, 6);
    addChips(g, 2.0, 0.96, -0.5, 4);
    env.addRotatedCollider(x, z, 5.2, 2.6, rotY);
}

// A stack of colorful chips on a table
function addChips(parent, x, y, z, count) {
    const colors = [0xc0392b, 0x2980b9, 0x27ae60, 0x1e1e1e, 0xf1c40f];
    for (let i = 0; i < count; i++) {
        addMesh(parent, new THREE.CylinderGeometry(0.12, 0.12, 0.05, 14), std(colors[(i + Math.round(x * 3)) % colors.length], { roughness: 0.5 }), x, y + 0.03 + i * 0.055, z).castShadow = false;
    }
}

// Blackjack: a half-round green table with cards and chips, and a dealer cat in a bow tie behind it
export function buildCardTable(env, x, z, rotY = 0) {
    const g = group(env, x, z, rotY);
    const felt = std(0x1e7a46, { roughness: 0.95 });
    const top = addMesh(g, new THREE.CylinderGeometry(2.2, 2.2, 0.12, 32, 1, false, Math.PI / 2, Math.PI), felt, 0, 0.92, -0.4);
    top.rotation.y = Math.PI;
    addMesh(g, new THREE.CylinderGeometry(2.0, 2.0, 0.85, 32, 1, false, Math.PI / 2, Math.PI), std(0x5d3a1a), 0, 0.43, -0.4).rotation.y = Math.PI;
    const rim = addMesh(g, new THREE.TorusGeometry(2.2, 0.1, 8, 32, Math.PI), std(0x3d2412, { roughness: 0.4 }), 0, 0.98, -0.4);
    rim.rotation.x = Math.PI / 2; // the round edge, towards the players (+z)
    // Cards in front of each seat, and chips
    const cardMat = std(0xffffff, { roughness: 0.6 });
    for (let s = 0; s < 4; s++) {
        const a = Math.PI * (0.2 + s * 0.2);
        const cx = Math.cos(a) * 1.4;
        const cz = -0.4 + Math.sin(a) * 1.4;
        [0, 1].forEach(c => {
            const card = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.32), cardMat);
            card.rotation.set(-Math.PI / 2, 0, a + c * 0.2);
            card.position.set(cx + c * 0.1, 1.0 + c * 0.003, cz);
            g.add(card);
        });
        addChips(g, cx * 0.75, 0.98, -0.4 + Math.sin(a) * 1.05, 2 + s);
    }
    const dealer = new Cat({ add() {} }, { name: 'Dealer', fur: 0x2d3436, spots: 0xffffff, eyes: 0x55efc4, outfits: ['bowTie', 'topHat'] });
    dealer.mesh.remove(dealer.nameTag);
    dealer.mesh.position.set(0, 0, -1.1);
    dealer.mesh.rotation.y = Math.PI; // cats look towards -z, the dealer faces the players
    g.add(dealer.mesh);
    env.animate((dt, t) => { dealer.headGroup.rotation.y = Math.sin(t * 0.9) * 0.6; });
    env.addRotatedCollider(x, z, 4.6, 3.4, rotY);
}

// A giant stack of golden chips (brokjes coins)
export function buildChipTower(env, x, z) {
    const g = group(env, x, z);
    const colors = [GOLD, 0xc0392b, GOLD, 0x1e1e1e];
    for (let i = 0; i < 10; i++) {
        const chip = addMesh(g, new THREE.CylinderGeometry(0.8, 0.8, 0.28, 24), std(colors[i % colors.length], { metalness: i % 2 ? 0 : 0.7, roughness: 0.35 }), Math.sin(i) * 0.08, 0.14 + i * 0.29, Math.cos(i) * 0.08);
        chip.rotation.y = i;
    }
    env.addCollider(x, z, 1.7, 1.7);
}

// Velvet rope between golden posts (along local x)
export function buildVelvetRope(env, x, z, rotY = 0, length = 4) {
    const g = group(env, x, z, rotY);
    const gold = std(GOLD, { metalness: 0.8, roughness: 0.3 });
    const posts = Math.max(2, Math.round(length / 2) + 1);
    const red = std(0xb3001b, { roughness: 0.8 });
    for (let i = 0; i < posts; i++) {
        const px = -length / 2 + (i / (posts - 1)) * length;
        addMesh(g, new THREE.CylinderGeometry(0.06, 0.06, 1.0, 10), gold, px, 0.5, 0);
        addMesh(g, new THREE.CylinderGeometry(0.22, 0.25, 0.06, 14), gold, px, 0.03, 0);
        addMesh(g, new THREE.SphereGeometry(0.09, 10, 8), gold, px, 1.03, 0);
        if (i > 0) {
            const span = length / (posts - 1);
            const rope = addMesh(g, new THREE.TorusGeometry(span / 2, 0.035, 6, 16, Math.PI), red, px - span / 2, 0.95, 0);
            rope.rotation.z = Math.PI;
            rope.scale.y = 0.35;
        }
    }
    env.addRotatedCollider(x, z, length + 0.4, 0.4, rotY);
}

// A bar counter with golden rail, bottles on a shelf and stools
export function buildCasinoBar(env, x, z, rotY = 0) {
    const g = group(env, x, z, rotY);
    addMesh(g, new THREE.BoxGeometry(6, 1.1, 1), std(0x3d2412, { roughness: 0.5 }), 0, 0.55, 0);
    addMesh(g, new THREE.BoxGeometry(6.2, 0.08, 1.2), std(0x111111, { roughness: 0.2, metalness: 0.3 }), 0, 1.14, 0);
    addMesh(g, new THREE.BoxGeometry(6, 0.06, 0.06), std(GOLD, { metalness: 0.8 }), 0, 0.25, 0.55);
    addMesh(g, new THREE.BoxGeometry(6, 0.1, 0.4), std(0x3d2412), 0, 2.2, -1.2);
    const bottleColors = [0x27ae60, 0xc0392b, 0xf39c12, 0x8e44ad, 0x2980b9];
    for (let i = 0; i < 14; i++) {
        addMesh(g, new THREE.CylinderGeometry(0.08, 0.1, 0.45, 8), std(bottleColors[i % 5], { roughness: 0.1, transparent: true, opacity: 0.85 }), -2.7 + i * 0.42, 2.48, -1.2).castShadow = false;
    }
    for (let i = 0; i < 4; i++) {
        const sx = -2.2 + i * 1.45;
        addMesh(g, new THREE.CylinderGeometry(0.05, 0.05, 0.8), std(GOLD, { metalness: 0.8 }), sx, 0.4, 1.0);
        addMesh(g, new THREE.CylinderGeometry(0.3, 0.3, 0.12, 14), std(0xb3001b, { roughness: 0.7 }), sx, 0.85, 1.0);
    }
    env.addRotatedCollider(x, z, 6.2, 1.4, rotY);
}

// ---------- Extras ----------

// Crystal chandeliers with warm lights
export function buildChandeliers(env) {
    const crystal = std(0xfff6e0, { roughness: 0.05, metalness: 0.3, emissive: 0xffe0a0, emissiveIntensity: 0.5 });
    const gold = std(GOLD, { metalness: 0.8, roughness: 0.3 });
    const top = env.wallHeight;
    [[-9, 0], [0, 0], [9, 0]].forEach(([x, z]) => {
        const g = new THREE.Group();
        g.position.set(x, top - 1.6, z);
        env.roomGroup.add(g);
        addMesh(g, new THREE.CylinderGeometry(0.03, 0.03, 1.6), gold, 0, 0.8, 0);
        addMesh(g, new THREE.TorusGeometry(1.0, 0.06, 8, 24), gold, 0, 0, 0).rotation.x = Math.PI / 2;
        addMesh(g, new THREE.TorusGeometry(0.6, 0.05, 8, 20), gold, 0, -0.4, 0).rotation.x = Math.PI / 2;
        for (let i = 0; i < 12; i++) {
            const a = (i / 12) * Math.PI * 2;
            addMesh(g, new THREE.SphereGeometry(0.09, 8, 6), crystal, Math.cos(a) * 1.0, -0.2, Math.sin(a) * 1.0).castShadow = false;
            if (i % 2 === 0) addMesh(g, new THREE.SphereGeometry(0.08, 8, 6), crystal, Math.cos(a) * 0.6, -0.6, Math.sin(a) * 0.6).castShadow = false;
        }
        addMesh(g, new THREE.SphereGeometry(0.18, 10, 8), crystal, 0, -0.9, 0).castShadow = false;
        const light = new THREE.PointLight(0xffd9a0, 0.9, 16);
        light.position.set(x, top - 2.4, z);
        env.lightsGroup.add(light);
    });
}

// A glowing neon sign on a wall (extra: { text, sub, color, wall, at, y })
export function buildNeonSign(env, extra) {
    const p = env.wallPoint(extra.wall || 'north', extra.at || 0, 0.08);
    const mat = new THREE.MeshBasicMaterial({ map: createBillboardTexture(extra.text || 'JACKPOT', extra.color || '#8e44ad', '#ffffff', extra.sub || '') });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(6, 3), mat);
    sign.position.set(p.x, extra.y || 5.5, p.z);
    sign.rotation.y = p.rotY;
    env.roomGroup.add(sign);
    // Neon flickers now and then
    env.animate((dt, t) => {
        const v = Math.sin(t * 23) > 0.97 ? 0.5 : 1;
        mat.color.setRGB(v, v, v);
    });
}

// The big prize wheel on a wall, slowly turning (extra: { wall, at, y })
export function buildPrizeWheel(env, extra) {
    const p = env.wallPoint(extra.wall || 'north', extra.at || 0, 0.25);
    const g = new THREE.Group();
    g.position.set(p.x, extra.y || 4.6, p.z);
    g.rotation.y = p.rotY;
    env.roomGroup.add(g);
    const wheel = new THREE.Group();
    g.add(wheel);
    const colors = [0xe74c3c, 0xf1c40f, 0x2ecc71, 0x3498db, 0x9b59b6, 0xe67e22];
    const segments = 12;
    for (let i = 0; i < segments; i++) {
        const seg = new THREE.Mesh(new THREE.CircleGeometry(2.2, 6, (i / segments) * Math.PI * 2, (Math.PI * 2) / segments), std(colors[i % colors.length], { roughness: 0.4 }));
        wheel.add(seg);
    }
    addMesh(wheel, new THREE.TorusGeometry(2.25, 0.12, 8, 40), std(GOLD, { metalness: 0.8, roughness: 0.3 }), 0, 0, 0.02);
    for (let i = 0; i < segments; i++) {
        const a = (i / segments) * Math.PI * 2;
        addMesh(wheel, new THREE.SphereGeometry(0.08, 8, 6), new THREE.MeshBasicMaterial({ color: 0xfff6c8 }), Math.cos(a) * 2.25, Math.sin(a) * 2.25, 0.12).castShadow = false;
    }
    addMesh(g, new THREE.CylinderGeometry(0.25, 0.25, 0.2, 16), std(GOLD, { metalness: 0.8 }), 0, 0, 0.12).rotation.x = Math.PI / 2;
    const pointer = addMesh(g, new THREE.ConeGeometry(0.25, 0.6, 3), std(0xffffff), 0, 2.55, 0.15);
    pointer.rotation.z = Math.PI;
    addSign(g, 'SPIN TO WIN!', 2.8, 0, -2.9, 0.05, '#2d3436', '#ffd32a');
    env.animate(dt => { wheel.rotation.z += dt * 0.5; });
}
