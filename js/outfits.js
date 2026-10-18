import * as THREE from 'three';

// --- Cat Outfits (decorative clothes bought in the shop) ---
// Each builder returns a THREE.Group positioned relative to the cat's headGroup
// (head sphere radius 0.42, centered at the origin, facing -Z).
const OUTFIT_BUILDERS = {
    topHat() {
        const g = new THREE.Group();
        const black = new THREE.MeshStandardMaterial({ color: 0x1e1e24, roughness: 0.5 });
        const band = new THREE.MeshStandardMaterial({ color: 0xd63031, roughness: 0.4 });
        const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.04, 20), black);
        const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.42, 20), black);
        crown.position.y = 0.22;
        const ribbon = new THREE.Mesh(new THREE.CylinderGeometry(0.245, 0.245, 0.07, 20), band);
        ribbon.position.y = 0.06;
        g.add(brim, crown, ribbon);
        g.position.set(0, 0.4, 0.02);
        g.rotation.x = -0.12;
        return g;
    },

    partyHat() {
        const g = new THREE.Group();
        const cone = new THREE.Mesh(
            new THREE.ConeGeometry(0.2, 0.5, 16),
            new THREE.MeshStandardMaterial({ color: 0x9b59b6, roughness: 0.5 })
        );
        cone.position.y = 0.25;
        const pom = new THREE.Mesh(
            new THREE.SphereGeometry(0.07, 10, 10),
            new THREE.MeshStandardMaterial({ color: 0xffd32a, roughness: 0.4 })
        );
        pom.position.y = 0.52;
        g.add(cone, pom);
        // Polka dots
        const dotMat = new THREE.MeshStandardMaterial({ color: 0x48dbfb });
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2;
            const h = 0.1 + (i % 2) * 0.14;
            const r = 0.2 * (1 - h / 0.5) + 0.005;
            const dot = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6), dotMat);
            dot.position.set(Math.cos(a) * r, h, Math.sin(a) * r);
            g.add(dot);
        }
        g.position.set(0, 0.36, 0);
        g.rotation.z = 0.15;
        return g;
    },

    crown() {
        const g = new THREE.Group();
        const gold = new THREE.MeshStandardMaterial({ color: 0xf1c40f, metalness: 0.35, roughness: 0.3, emissive: 0x7a5c00, emissiveIntensity: 0.35 });
        const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.12, 16, 1, true), gold);
        ring.material.side = THREE.DoubleSide;
        g.add(ring);
        const gemColors = [0xe74c3c, 0x3742fa, 0x2ed573];
        for (let i = 0; i < 5; i++) {
            const a = (i / 5) * Math.PI * 2;
            const spike = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.16, 6), gold);
            spike.position.set(Math.cos(a) * 0.25, 0.13, Math.sin(a) * 0.25);
            g.add(spike);
            const gem = new THREE.Mesh(
                new THREE.SphereGeometry(0.035, 8, 8),
                new THREE.MeshStandardMaterial({ color: gemColors[i % 3], roughness: 0.1, emissive: gemColors[i % 3], emissiveIntensity: 0.3 })
            );
            gem.position.set(Math.cos(a) * 0.265, 0, Math.sin(a) * 0.265);
            g.add(gem);
        }
        g.position.set(0, 0.42, 0.02);
        return g;
    },

    // Japanese samurai helmet (kabuto): lacquered dome, neck guard and golden horns
    samuraiHelmet() {
        const g = new THREE.Group();
        const lacquer = new THREE.MeshStandardMaterial({ color: 0xb71c1c, roughness: 0.3, metalness: 0.2, side: THREE.DoubleSide });
        const gold = new THREE.MeshStandardMaterial({ color: 0xf1c40f, metalness: 0.35, roughness: 0.3, emissive: 0x7a5c00, emissiveIntensity: 0.35, side: THREE.DoubleSide });

        // Tall dome (covers the ears) with ridges and a golden knob on top
        const domeGroup = new THREE.Group();
        domeGroup.scale.y = 1.3;
        const dome = new THREE.Mesh(new THREE.SphereGeometry(0.45, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), lacquer);
        domeGroup.add(dome);
        const ridgeMat = new THREE.MeshStandardMaterial({ color: 0x2d1e1e, roughness: 0.4 });
        for (let i = 0; i < 6; i++) {
            const ridge = new THREE.Mesh(new THREE.TorusGeometry(0.452, 0.012, 4, 20, Math.PI), ridgeMat);
            ridge.rotation.y = (i / 6) * Math.PI;
            domeGroup.add(ridge);
        }
        g.add(domeGroup);
        const knob = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 10), gold);
        knob.position.y = 0.58;
        g.add(knob);

        // Flared neck guard around the back and sides (open at the front so the eyes stay visible)
        const guard = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.6, 0.2, 20, 1, true, -Math.PI * 0.62, Math.PI * 1.24), lacquer);
        guard.position.y = -0.08;
        g.add(guard);
        const guardTrim = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.015, 4, 24, Math.PI * 1.24), gold);
        guardTrim.rotation.x = Math.PI / 2;
        guardTrim.rotation.z = Math.PI * 0.5 - Math.PI * 0.62;
        guardTrim.position.y = -0.18;
        g.add(guardTrim);

        // Small front visor
        const visor = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.52, 0.05, 20, 1, true, Math.PI * 0.62, Math.PI * 0.76), lacquer);
        visor.position.y = 0.0;
        g.add(visor);

        // Golden crest: round badge with two tall horns in a V (kuwagata)
        const badge = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.03, 16), gold);
        badge.rotation.x = Math.PI / 2;
        badge.position.set(0, 0.16, -0.45);
        g.add(badge);
        [-1, 1].forEach(side => {
            const horn = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.6, 0.03), gold);
            horn.position.set(side * 0.17, 0.42, -0.45);
            horn.rotation.z = -side * 0.45;
            g.add(horn);
        });

        g.position.set(0, 0.14, 0.02);
        return g;
    },

    beard() {
        const g = new THREE.Group();
        const beardGeo = new THREE.ConeGeometry(0.2, 0.55, 12);
        const beard = new THREE.Mesh(beardGeo, new THREE.MeshStandardMaterial({ color: 0xf1f2f6, roughness: 0.9 }));
        beard.rotation.x = Math.PI;
        beard.position.set(0, -0.42, -0.3);
        beard.rotation.z = 0;
        g.add(beard);
        return g;
    },

    moustache() {
        const g = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({ color: 0x1e1e24, roughness: 0.6 });
        [-1, 1].forEach(side => {
            const curl = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.025, 6, 12, Math.PI * 1.3), mat);
            curl.position.set(side * 0.08, -0.13, -0.5);
            curl.rotation.set(0, 0, side > 0 ? -0.3 : Math.PI + 0.3);
            g.add(curl);
        });
        return g;
    },

    sunglasses() {
        const g = new THREE.Group();
        const lensMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.05, metalness: 0.6 });
        const frameMat = new THREE.MeshStandardMaterial({ color: 0xff4757, roughness: 0.3 });
        [-1, 1].forEach(side => {
            const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.03, 16), lensMat);
            lens.rotation.x = Math.PI / 2;
            lens.position.set(side * 0.16, 0.08, -0.43);
            g.add(lens);
        });
        const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.03, 0.03), frameMat);
        bridge.position.set(0, 0.11, -0.44);
        g.add(bridge);
        [-1, 1].forEach(side => {
            const arm = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.34), frameMat);
            arm.position.set(side * 0.3, 0.1, -0.26);
            g.add(arm);
        });
        return g;
    },

    bowTie() {
        const g = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({ color: 0x3742fa, roughness: 0.4 });
        [-1, 1].forEach(side => {
            const wing = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.18, 4), mat);
            wing.rotation.z = side * Math.PI / 2;
            wing.position.set(side * 0.09, 0, 0);
            g.add(wing);
        });
        const knot = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), mat);
        g.add(knot);
        g.position.set(0, -0.3, -0.38);
        return g;
    },

    scarf() {
        const g = new THREE.Group();
        const red = new THREE.MeshStandardMaterial({ color: 0xe74c3c, roughness: 0.9 });
        const white = new THREE.MeshStandardMaterial({ color: 0xf1f2f6, roughness: 0.9 });
        const wrap = new THREE.Mesh(new THREE.TorusGeometry(0.37, 0.09, 8, 24), red);
        wrap.rotation.x = Math.PI / 2;
        wrap.position.set(0, -0.26, -0.05);
        g.add(wrap);
        // Hanging striped tail
        for (let i = 0; i < 4; i++) {
            const seg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.05), i % 2 ? white : red);
            seg.position.set(0.18, -0.36 - i * 0.1, -0.36);
            g.add(seg);
        }
        return g;
    }
};

export function buildOutfit(builderName) {
    const builder = OUTFIT_BUILDERS[builderName];
    if (!builder) {
        console.warn(`Unknown outfit builder: "${builderName}"`);
        return null;
    }
    const group = builder();
    group.traverse(o => { if (o.isMesh) o.castShadow = true; });
    return group;
}

// Toy "Brokjes Blaster" carried on the cat's back once bought.
export function buildBlasterModel() {
    const g = new THREE.Group();
    const body = new THREE.MeshStandardMaterial({ color: 0x2ed573, roughness: 0.4 });
    const accent = new THREE.MeshStandardMaterial({ color: 0xffa502, roughness: 0.3, emissive: 0xff7f00, emissiveIntensity: 0.4 });
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.55, 12), body);
    barrel.rotation.x = Math.PI / 2;
    const tank = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), accent);
    tank.position.set(0, 0.06, 0.22);
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.06, 12), accent);
    tip.rotation.x = Math.PI / 2;
    tip.position.z = -0.29;
    g.add(barrel, tank, tip);
    g.traverse(o => { if (o.isMesh) o.castShadow = true; });
    return g;
}
