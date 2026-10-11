// --- Particle System for Dust & Catch Stars ---
class ParticleManager {
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

    spawnCatchBurst(pos) {
        const colors = [0xffd32a, 0xff4757, 0x2ed573, 0xffa502, 0xffffff];
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

    update(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            const u = p.userData;
            u.life -= u.decay * dt;

            p.position.addScaledVector(u.vel, dt);
            u.vel.y -= 9.8 * dt;

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
