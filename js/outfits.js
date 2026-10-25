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
    },

    cowboyHat() {
        const g = new THREE.Group();
        const leather = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.7 });
        const brimGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.03, 24);
        // Curl the sides of the brim up
        const pos = brimGeo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i);
            pos.setY(i, pos.getY(i) + Math.max(0, Math.abs(x) - 0.25) * 0.5);
        }
        brimGeo.computeVertexNormals();
        g.add(new THREE.Mesh(brimGeo, leather));
        const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.26, 0.3, 20), leather);
        crown.position.y = 0.16;
        crown.scale.z = 0.85;
        const dent = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.3), new THREE.MeshStandardMaterial({ color: 0x6d4422, roughness: 0.7 }));
        dent.position.y = 0.31;
        const band = new THREE.Mesh(new THREE.CylinderGeometry(0.255, 0.26, 0.05, 20), new THREE.MeshStandardMaterial({ color: 0x2d3436 }));
        band.position.y = 0.05;
        band.scale.z = 0.85;
        g.add(crown, dent, band);
        g.position.set(0, 0.4, 0.02);
        g.rotation.x = -0.1;
        return g;
    },

    // Black pirate tricorn with gold trim and a little paw emblem
    pirateHat() {
        const g = new THREE.Group();
        const black = new THREE.MeshStandardMaterial({ color: 0x1e1e24, roughness: 0.6 });
        const gold = new THREE.MeshStandardMaterial({ color: 0xf1c40f, metalness: 0.4, roughness: 0.3 });
        const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.06, 3), black);
        brim.rotation.y = Math.PI; // one corner points forward
        const trim = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.02, 4, 3), gold);
        trim.rotation.set(Math.PI / 2, 0, Math.PI / 2);
        trim.position.y = 0.03;
        const crown = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), black);
        crown.scale.y = 0.9;
        const emblem = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), new THREE.MeshStandardMaterial({ color: 0xffffff }));
        emblem.position.set(0, 0.12, -0.25);
        g.add(brim, trim, crown, emblem);
        g.position.set(0, 0.38, 0.02);
        return g;
    },

    wizardHat() {
        const g = new THREE.Group();
        const blue = new THREE.MeshStandardMaterial({ color: 0x3c40c6, roughness: 0.6 });
        const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.03, 24), blue);
        const lower = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.5, 20, 1, true), blue);
        lower.position.y = 0.25;
        // Floppy bent tip
        const tip = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.4, 16), blue);
        tip.position.set(0.08, 0.6, 0.04);
        tip.rotation.z = -0.6;
        const starMat = new THREE.MeshStandardMaterial({ color: 0xffd32a, emissive: 0xffd32a, emissiveIntensity: 0.5 });
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2;
            const h = 0.08 + (i % 3) * 0.12;
            const r = 0.28 * (1 - h / 0.5) + 0.01;
            const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.035), starMat);
            star.position.set(Math.cos(a) * r, h, Math.sin(a) * r);
            g.add(star);
        }
        g.add(brim, lower, tip);
        g.position.set(0, 0.38, 0.02);
        return g;
    },

    chefHat() {
        const g = new THREE.Group();
        const white = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
        const band = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.2, 20), white);
        band.position.y = 0.1;
        g.add(band);
        [[0, 0.38, 0, 0.24], [0.17, 0.33, 0.05, 0.17], [-0.17, 0.33, 0.05, 0.17], [0, 0.33, -0.17, 0.17], [0, 0.33, 0.17, 0.17]].forEach(([x, y, z, r]) => {
            const puff = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), white);
            puff.position.set(x, y, z);
            g.add(puff);
        });
        g.position.set(0, 0.36, 0.02);
        return g;
    },

    vikingHelmet() {
        const g = new THREE.Group();
        const metal = new THREE.MeshStandardMaterial({ color: 0x95a5a6, metalness: 0.7, roughness: 0.3, side: THREE.DoubleSide });
        const gold = new THREE.MeshStandardMaterial({ color: 0xd4a017, metalness: 0.5, roughness: 0.3 });
        const horn = new THREE.MeshStandardMaterial({ color: 0xf5e6ca, roughness: 0.5 });
        // Tall dome so the ears fit inside
        const domeGroup = new THREE.Group();
        domeGroup.scale.y = 1.35;
        const dome = new THREE.Mesh(new THREE.SphereGeometry(0.45, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), metal);
        const ridge = new THREE.Mesh(new THREE.TorusGeometry(0.455, 0.02, 4, 20, Math.PI), gold);
        domeGroup.add(dome, ridge);
        const band = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.08, 20, 1, true), gold);
        band.position.y = 0.03;
        g.add(domeGroup, band);
        [-1, 1].forEach(side => {
            const h = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.45, 12), horn);
            h.position.set(side * 0.5, 0.22, 0);
            h.rotation.z = -side * 0.9;
            g.add(h);
        });
        g.position.set(0, 0.12, 0.02);
        return g;
    },

    // Colorful beanie with a little propeller on top
    propellerCap() {
        const g = new THREE.Group();
        const colors = [0xff4757, 0xffd32a, 0x2ed573, 0x1e90ff];
        colors.forEach((color, i) => {
            const quarter = new THREE.Mesh(
                new THREE.SphereGeometry(0.43, 10, 8, (i * Math.PI) / 2, Math.PI / 2, 0, Math.PI / 2),
                new THREE.MeshStandardMaterial({ color, roughness: 0.6, side: THREE.DoubleSide })
            );
            g.add(quarter);
        });
        const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.15), new THREE.MeshStandardMaterial({ color: 0x2d3436 }));
        stick.position.y = 0.5;
        const bladeMat = new THREE.MeshStandardMaterial({ color: 0x9b59b6, roughness: 0.4 });
        [-1, 1].forEach(side => {
            const blade = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.01, 0.07), bladeMat);
            blade.position.set(side * 0.14, 0.58, 0);
            blade.rotation.x = side * 0.3;
            g.add(blade);
        });
        g.add(stick);
        g.position.set(0, 0.06, 0.02);
        return g;
    },

    // See-through space helmet (the whole head fits inside)
    astronautHelmet() {
        const g = new THREE.Group();
        const glass = new THREE.Mesh(
            new THREE.SphereGeometry(0.62, 24, 18),
            new THREE.MeshStandardMaterial({ color: 0xc7ecee, transparent: true, opacity: 0.25, roughness: 0.05, metalness: 0.2, depthWrite: false })
        );
        const white = new THREE.MeshStandardMaterial({ color: 0xf5f6fa, roughness: 0.4 });
        const collar = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.08, 10, 24), white);
        collar.rotation.x = Math.PI / 2;
        collar.position.y = -0.42;
        const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.3), white);
        antenna.position.set(0.3, 0.6, 0.1);
        const ball = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), new THREE.MeshStandardMaterial({ color: 0xff4757, emissive: 0xff4757, emissiveIntensity: 0.8 }));
        ball.position.set(0.3, 0.77, 0.1);
        g.add(glass, collar, antenna, ball);
        g.position.set(0, 0.04, 0);
        return g;
    },

    monocle() {
        const g = new THREE.Group();
        const gold = new THREE.MeshStandardMaterial({ color: 0xf1c40f, metalness: 0.6, roughness: 0.2 });
        const rim = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.015, 8, 20), gold);
        rim.position.set(0.16, 0.08, -0.43);
        const lens = new THREE.Mesh(new THREE.CircleGeometry(0.1, 20), new THREE.MeshStandardMaterial({ color: 0xdff9fb, transparent: true, opacity: 0.35 }));
        lens.position.set(0.16, 0.08, -0.435);
        lens.rotation.y = Math.PI;
        const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.4), gold);
        chain.position.set(0.25, -0.12, -0.38);
        chain.rotation.z = 0.3;
        g.add(rim, lens, chain);
        return g;
    },

    eyePatch() {
        const g = new THREE.Group();
        const black = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.6 });
        const patch = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.03, 16), black);
        patch.rotation.x = Math.PI / 2;
        patch.position.set(-0.16, 0.08, -0.4);
        const strap = new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.012, 6, 32), black);
        strap.rotation.set(0, 0, -0.45);
        strap.position.y = 0.1;
        strap.scale.z = 1.0;
        g.add(patch, strap);
        return g;
    },

    clownNose() {
        const g = new THREE.Group();
        const nose = new THREE.Mesh(new THREE.SphereGeometry(0.09, 14, 12), new THREE.MeshStandardMaterial({ color: 0xff3838, roughness: 0.25 }));
        nose.position.set(0, -0.04, -0.52);
        g.add(nose);
        return g;
    },

    heartGlasses() {
        const g = new THREE.Group();
        const heart = new THREE.Shape();
        heart.moveTo(0, -0.08);
        heart.bezierCurveTo(-0.13, 0.0, -0.1, 0.11, 0, 0.05);
        heart.bezierCurveTo(0.1, 0.11, 0.13, 0.0, 0, -0.08);
        const lensMat = new THREE.MeshStandardMaterial({ color: 0xff6b81, roughness: 0.1, metalness: 0.3, side: THREE.DoubleSide });
        [-1, 1].forEach(side => {
            const lens = new THREE.Mesh(new THREE.ShapeGeometry(heart), lensMat);
            lens.position.set(side * 0.16, 0.08, -0.44);
            g.add(lens);
        });
        const frameMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
        const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.025, 0.025), frameMat);
        bridge.position.set(0, 0.1, -0.44);
        g.add(bridge);
        [-1, 1].forEach(side => {
            const arm = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.025, 0.34), frameMat);
            arm.position.set(side * 0.3, 0.1, -0.26);
            g.add(arm);
        });
        return g;
    },

    goldMedal() {
        const g = new THREE.Group();
        const ribbonMat = new THREE.MeshStandardMaterial({ color: 0x0984e3, roughness: 0.6 });
        const ribbon = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.03, 6, 24), ribbonMat);
        ribbon.rotation.x = Math.PI / 2 - 0.5;
        ribbon.position.set(0, -0.3, -0.12);
        const gold = new THREE.MeshStandardMaterial({ color: 0xf1c40f, metalness: 0.6, roughness: 0.25, emissive: 0x7a5c00, emissiveIntensity: 0.3 });
        const medal = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.03, 20), gold);
        medal.rotation.x = Math.PI / 2;
        medal.position.set(0, -0.5, -0.42);
        const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.05), new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.3 }));
        star.position.set(0, -0.5, -0.45);
        star.scale.z = 0.3;
        g.add(ribbon, medal, star);
        return g;
    },

    bandana() {
        const g = new THREE.Group();
        const red = new THREE.MeshStandardMaterial({ color: 0xd63031, roughness: 0.8, side: THREE.DoubleSide });
        const wrap = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.05, 6, 24), red);
        wrap.rotation.x = Math.PI / 2;
        wrap.position.set(0, -0.27, -0.05);
        // Triangle hanging over the chest
        const flap = new THREE.Mesh(new THREE.CircleGeometry(0.22, 3), red);
        flap.rotation.set(-0.35, 0, -Math.PI / 2);
        flap.position.set(0, -0.4, -0.36);
        g.add(wrap, flap);
        const dotMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
        [[-0.06, -0.36], [0.06, -0.36], [0, -0.46]].forEach(([dx, dy]) => {
            const dot = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 6), dotMat);
            dot.position.set(dx, dy, -0.39);
            g.add(dot);
        });
        return g;
    },

    // Back slot: red superhero cape draped over the cat's back
    superCape() {
        const g = new THREE.Group();
        const cape = new THREE.Mesh(
            new THREE.CylinderGeometry(0.56, 0.44, 1.3, 18, 1, true, Math.PI / 2, Math.PI),
            new THREE.MeshStandardMaterial({ color: 0xe50914, roughness: 0.6, side: THREE.DoubleSide })
        );
        cape.rotation.x = Math.PI / 2;
        cape.position.set(0, -0.45, 0.88);
        const clasp = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), new THREE.MeshStandardMaterial({ color: 0xf1c40f, metalness: 0.6, roughness: 0.3 }));
        clasp.position.set(0, -0.28, -0.32);
        const emblem = new THREE.Mesh(new THREE.CircleGeometry(0.14, 16), new THREE.MeshStandardMaterial({ color: 0xffd32a, side: THREE.DoubleSide }));
        emblem.rotation.x = -Math.PI / 2;
        emblem.position.set(0, 0.07, 0.95);
        g.add(cape, clasp, emblem);
        return g;
    },

    // Back slot: sparkly butterfly wings
    butterflyWings() {
        const g = new THREE.Group();
        const wingMat = new THREE.MeshStandardMaterial({ color: 0xa29bfe, transparent: true, opacity: 0.85, roughness: 0.3, side: THREE.DoubleSide, emissive: 0x6c5ce7, emissiveIntensity: 0.25 });
        const spotMat = new THREE.MeshStandardMaterial({ color: 0xfd79a8, side: THREE.DoubleSide });
        [-1, 1].forEach(side => {
            [[0.32, 0.22, 0.3], [0.2, -0.05, 0.2]].forEach(([r, y, dz], i) => {
                const wing = new THREE.Mesh(new THREE.CircleGeometry(r, 20), wingMat);
                wing.scale.y = 0.75;
                wing.position.set(side * (0.2 + r * 0.8), 0.1 + y, 0.75 + dz);
                wing.rotation.set(0, side * 1.1, side * (i ? -0.3 : 0.3));
                g.add(wing);
                const spot = new THREE.Mesh(new THREE.CircleGeometry(r * 0.35, 12), spotMat);
                spot.position.copy(wing.position);
                spot.position.x += side * 0.01;
                spot.rotation.copy(wing.rotation);
                g.add(spot);
            });
        });
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

// "Super Squirter" water gun carried on the cat's other side once bought.
export function buildSquirterModel() {
    const g = new THREE.Group();
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.35, 12), new THREE.MeshStandardMaterial({ color: 0x48dbfb, roughness: 0.2, transparent: true, opacity: 0.85 }));
    tank.rotation.x = Math.PI / 2;
    tank.position.z = 0.15;
    const body = new THREE.MeshStandardMaterial({ color: 0xff9ff3, roughness: 0.4 });
    const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.45), body);
    barrel.position.z = -0.12;
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.12, 10), new THREE.MeshStandardMaterial({ color: 0xffd32a }));
    nozzle.rotation.x = Math.PI / 2;
    nozzle.position.z = -0.4;
    g.add(tank, barrel, nozzle);
    g.traverse(o => { if (o.isMesh) o.castShadow = true; });
    return g;
}

// The golden "Cat Army Horn" (the most expensive item in the shop), hung on the cat once bought.
export function buildCatArmyHornModel() {
    const g = new THREE.Group();
    const gold = new THREE.MeshStandardMaterial({ color: 0xf1c40f, metalness: 0.9, roughness: 0.2, emissive: 0x7a5c00, emissiveIntensity: 0.3 });
    const tube = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.05, 8, 24, Math.PI * 1.3), gold);
    tube.rotation.y = Math.PI / 2;
    const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.05, 0.4, 16, 1, true), gold);
    bell.material.side = THREE.DoubleSide;
    // The bell sits at the end of the curved tube, opening forward
    const end = Math.PI * 1.3;
    bell.position.set(0, Math.sin(end) * 0.28, Math.cos(end) * 0.28 - 0.15);
    bell.rotation.x = -Math.PI / 2 - 0.4;
    const mouthpiece = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.06, 0.14, 10), gold);
    mouthpiece.position.set(0, 0.06, 0.29);
    mouthpiece.rotation.x = Math.PI / 2;
    const tassel = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.2, 8), new THREE.MeshStandardMaterial({ color: 0xd63031, roughness: 0.7 }));
    tassel.position.set(0, -0.36, 0);
    g.add(tube, bell, mouthpiece, tassel);
    g.traverse(o => { if (o.isMesh) o.castShadow = true; });
    return g;
}

// Diving mask with a snorkel, worn automatically underwater (head space, like the outfits)
export function buildDivingMask() {
    const g = new THREE.Group();
    const strap = new THREE.MeshStandardMaterial({ color: 0x2f3542, roughness: 0.6 });
    const glass = new THREE.MeshStandardMaterial({ color: 0x9be7ff, transparent: true, opacity: 0.45, roughness: 0.05, metalness: 0.3 });
    const frame = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.04, 8, 20), new THREE.MeshStandardMaterial({ color: 0xff9f43, roughness: 0.4 }));
    frame.scale.set(1.5, 1, 1);
    frame.position.set(0, 0.08, -0.4);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.2, 20), glass);
    lens.scale.set(1.5, 1, 1);
    lens.position.set(0, 0.08, -0.41);
    lens.rotation.y = Math.PI;
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.025, 6, 24), strap);
    band.rotation.x = Math.PI / 2;
    band.position.y = 0.08;
    const snorkel = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.7, 8), new THREE.MeshStandardMaterial({ color: 0xffd32a, roughness: 0.4 }));
    snorkel.position.set(0.36, 0.35, -0.1);
    g.add(frame, lens, band, snorkel);
    return g;
}
