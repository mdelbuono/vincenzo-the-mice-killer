import * as THREE from 'three';

// --- Particle System for Dust & Catch Stars ---
export class ParticleManager {
    constructor(scene) {
        this.scene = scene;
        this.particles = [];
        this.starGeo = new THREE.DodecahedronGeometry(0.2, 0);
        this.dustGeo = new THREE.SphereGeometry(0.12, 5, 5);
    }

    spawnDust(pos) {
        const mat = new THREE.MeshBasicMaterial({
            color: 0xdfd5cb,
            transparent: true,
            opacity: 0.6
        });
        const p = new THREE.Mesh(this.dustGeo, mat);
        p.position.copy(pos);
        p.position.y = 0.15;
        p.userData = {
            vel: new THREE.Vector3((Math.random() - 0.5) * 1.5, Math.random() * 0.8 + 0.3, (Math.random() - 0.5) * 1.5),
            life: 1.0,
            decay: 2.5
        };
        this.scene.add(p);
        this.particles.push(p);
    }

    spawnCatchBurst(pos, colors = [0xffd32a, 0xff4757, 0x2ed573, 0xffa502, 0xffffff]) {
        for (let i = 0; i < 20; i++) {
            const color = colors[Math.floor(Math.random() * colors.length)];
            const mat = new THREE.MeshBasicMaterial({ color: color });
            const star = new THREE.Mesh(this.starGeo, mat);
            star.position.copy(pos);
            star.position.y += 0.4;
            const angle = Math.random() * Math.PI * 2;
            const elevation = Math.random() * Math.PI * 0.5;
            const speed = 4 + Math.random() * 5;
            star.userData = {
                vel: new THREE.Vector3(
                    Math.cos(angle) * Math.cos(elevation) * speed,
                    Math.sin(elevation) * speed + 2,
                    Math.sin(angle) * Math.cos(elevation) * speed
                ),
                life: 1.0,
                decay: 1.4,
                rot: new THREE.Vector3(Math.random() * 10, Math.random() * 10, Math.random() * 10)
            };
            this.scene.add(star);
            this.particles.push(star);
        }
    }

    // Expanding ring of pepper-sneeze cloud puffs
    spawnSneezeCloud(pos, radius) {
        const colors = [0xc8e6a0, 0xf6e58d, 0xdfe6e9];
        for (let i = 0; i < 48; i++) {
            const mat = new THREE.MeshBasicMaterial({
                color: colors[i % colors.length],
                transparent: true,
                opacity: 0.75
            });
            const p = new THREE.Mesh(this.dustGeo, mat);
            p.position.copy(pos);
            p.position.y = 0.6;
            const angle = (i / 48) * Math.PI * 2 + Math.random() * 0.2;
            const speed = radius * (1.6 + Math.random() * 0.8);
            p.userData = {
                vel: new THREE.Vector3(Math.cos(angle) * speed, 4 + Math.random() * 2, Math.sin(angle) * speed),
                life: 1.6,
                decay: 2.2
            };
            this.scene.add(p);
            this.particles.push(p);
        }
    }

    // Small orange spark puff where a blaster pellet hits
    spawnPelletHit(pos) {
        for (let i = 0; i < 8; i++) {
            const mat = new THREE.MeshBasicMaterial({ color: i % 2 ? 0xffa502 : 0xffd32a });
            const p = new THREE.Mesh(this.dustGeo, mat);
            p.position.copy(pos);
            p.userData = {
                vel: new THREE.Vector3((Math.random() - 0.5) * 5, Math.random() * 3 + 1, (Math.random() - 0.5) * 5),
                life: 0.8,
                decay: 2.5
            };
            this.scene.add(p);
            this.particles.push(p);
        }
    }

    // Cone of water droplets from the Super Squirter
    spawnSplash(pos, dir, spread) {
        const baseAngle = Math.atan2(dir.z, dir.x);
        for (let i = 0; i < 36; i++) {
            const mat = new THREE.MeshBasicMaterial({ color: i % 3 ? 0x48dbfb : 0xdff9fb, transparent: true, opacity: 0.85 });
            const p = new THREE.Mesh(this.dustGeo, mat);
            p.position.copy(pos);
            const angle = baseAngle + (Math.random() - 0.5) * 2 * spread;
            const speed = 9 + Math.random() * 7;
            p.userData = {
                vel: new THREE.Vector3(Math.cos(angle) * speed, 2 + Math.random() * 2, Math.sin(angle) * speed),
                life: 1.0,
                decay: 1.8
            };
            this.scene.add(p);
            this.particles.push(p);
        }
    }

    // Underwater: a few bubbles wobbling up from the cat
    spawnBubbles(pos, count = 3) {
        for (let i = 0; i < count; i++) {
            const mat = new THREE.MeshBasicMaterial({ color: 0xe0f7ff, transparent: true, opacity: 0.7 });
            const p = new THREE.Mesh(this.dustGeo, mat);
            p.position.set(pos.x + (Math.random() - 0.5) * 0.4, pos.y + 0.8, pos.z + (Math.random() - 0.5) * 0.4);
            p.userData = {
                vel: new THREE.Vector3((Math.random() - 0.5) * 0.4, 1.5 + Math.random(), (Math.random() - 0.5) * 0.4),
                life: 1.0,
                decay: 0.7,
                rises: true // no gravity
            };
            this.scene.add(p);
            this.particles.push(p);
        }
    }

    update(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            const u = p.userData;
            u.life -= u.decay * dt;

            p.position.addScaledVector(u.vel, dt);
            if (!u.rises) u.vel.y -= 9.8 * dt;

            if (u.rot) {
                p.rotation.x += u.rot.x * dt;
                p.rotation.y += u.rot.y * dt;
            }

            p.scale.setScalar(Math.max(0.01, u.life));

            if (u.life <= 0 || p.position.y < 0.05) {
                this.scene.remove(p);
                p.geometry.dispose();
                p.material.dispose();
                this.particles.splice(i, 1);
            }
        }
    }
}
