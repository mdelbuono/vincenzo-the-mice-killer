import * as THREE from 'three';
import { sound } from './sound.js';

// --- In-Hunt Abilities: timed boosts, pepper sneeze, and the brokjes blaster ---
export class AbilityManager {
    constructor(game) {
        this.game = game;
        this.activeBoosts = {}; // itemId -> seconds remaining
        this.pellets = [];
        this.blasterCooldown = 0;
        this.pelletGeo = new THREE.SphereGeometry(0.14, 8, 8);
        this.pelletMat = new THREE.MeshBasicMaterial({ color: 0xffa502 });

        this.bar = document.getElementById('powerup-bar');
        this.slots = {}; // itemId -> { btn, countEl }
    }

    get shop() { return this.game.shop; }

    // Shop items that can be used during a hunt (boosts and weapon ammo)
    usableItems() {
        return this.shop.catalog.items.filter(i => i.key && (i.type === 'boost' || i.type === 'ammo'));
    }

    // Returns true if the key belongs to an ability
    handleKey(key) {
        const item = this.usableItems().find(i => i.key === key);
        if (!item) return false;
        this.use(item.id);
        return true;
    }

    use(itemId) {
        const g = this.game;
        if (!g.isRunning || g.isPaused) return;
        const item = this.shop.itemsById[itemId];
        if (!item) return;

        if (item.requires && !this.shop.isOwned(item.requires)) {
            const needed = this.shop.itemsById[item.requires];
            g.showToast(`You need the ${needed ? needed.name : item.requires}! 🛒`);
            return;
        }
        if (this.shop.count(itemId) <= 0) {
            g.showToast(`No ${item.name} left! Visit the 🛒 Shop`);
            return;
        }

        if (item.type === 'boost') {
            if (this.activeBoosts[itemId] > 0) {
                g.showToast(`${item.name} is already active!`);
                return;
            }
            // Activate before consuming so the bar keeps showing the timer of the last one
            this.activeBoosts[itemId] = item.duration;
            this.shop.consume(itemId);
            if (item.effect === 'golden') g.mice.forEach(m => m.setGolden(true));
            sound.playPowerUp();
            g.showToast(`${item.icon} ${item.name.toUpperCase()}! (${item.duration}s)`);
        } else if (item.weapon === 'sneeze') {
            this.shop.consume(itemId);
            this.sneeze();
        } else if (item.weapon === 'blaster') {
            if (this.blasterCooldown > 0) return;
            this.shop.consume(itemId);
            this.fireBlaster();
        }
        this.updateBarTimers();
    }

    brokjesMultiplier() {
        let mult = 1;
        for (const id of Object.keys(this.activeBoosts)) {
            const item = this.shop.itemsById[id];
            if (item && item.effect === 'brokjes') mult = Math.max(mult, item.value);
        }
        return mult;
    }

    speedMultiplier() {
        let mult = 1;
        for (const id of Object.keys(this.activeBoosts)) {
            const item = this.shop.itemsById[id];
            if (item && item.effect === 'speed') mult = Math.max(mult, item.value);
        }
        return mult;
    }

    goldenMiceActive() {
        return Object.keys(this.activeBoosts).some(id => {
            const item = this.shop.itemsById[id];
            return item && item.effect === 'golden';
        });
    }

    // Mice the player can currently see on screen (inside the camera's view)
    miceInView() {
        const cam = this.game.camera;
        cam.updateMatrixWorld();
        const frustum = new THREE.Frustum().setFromProjectionMatrix(
            new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse)
        );
        const point = new THREE.Vector3();
        return this.game.mice.filter(m => frustum.containsPoint(point.set(m.position.x, 0.2, m.position.z)));
    }

    sneeze() {
        const g = this.game;
        g.vincenzo.triggerSneeze();
        sound.playSneeze();

        // Knock-out happens on the "...CHOO!": every mouse in view is hit
        setTimeout(() => {
            if (!g.isRunning) return;
            g.particles.spawnSneezeCloud(g.vincenzo.position, 10);

            const hits = this.miceInView();
            let earned = 0;
            for (const mouse of hits) {
                if (!g.isRunning) break;
                earned += g.catchMouse(mouse, { silent: true });
            }
            if (hits.length > 0) {
                sound.playCatchSuccess();
                if (g.isRunning) g.showToast(`ACHOO! ${hits.length} ${hits.length === 1 ? 'MOUSE' : 'MICE'}! +${earned} BROKJES 🤧`);
            } else {
                g.showToast('ACHOO! ...no mice nearby 🤧');
            }
        }, 330);
    }

    fireBlaster() {
        const g = this.game;
        const cat = g.vincenzo;
        const dir = new THREE.Vector3(-Math.sin(cat.rotationY), 0, -Math.cos(cat.rotationY));

        // Gentle auto-aim at the closest mouse roughly in front of the cat
        let bestDist = Infinity;
        let aimDir = null;
        for (const m of g.mice) {
            const toMouse = new THREE.Vector3(m.position.x - cat.position.x, 0, m.position.z - cat.position.z);
            const dist = toMouse.length();
            if (dist < 0.01 || dist > 22) continue;
            if (dir.angleTo(toMouse) < 0.35 && dist < bestDist) {
                bestDist = dist;
                aimDir = toMouse.normalize();
            }
        }
        if (aimDir) dir.copy(aimDir);

        const pellet = new THREE.Mesh(this.pelletGeo, this.pelletMat);
        pellet.position.set(cat.position.x + dir.x * 0.9, 0.45, cat.position.z + dir.z * 0.9);
        pellet.userData = { vel: dir.multiplyScalar(28), life: 0.9 };
        g.scene.add(pellet);
        this.pellets.push(pellet);

        sound.playBlaster();
        this.blasterCooldown = 0.25;
    }

    removePellet(index) {
        this.game.scene.remove(this.pellets[index]);
        this.pellets.splice(index, 1);
    }

    update(dt) {
        const g = this.game;

        for (const id of Object.keys(this.activeBoosts)) {
            this.activeBoosts[id] -= dt;
            if (this.activeBoosts[id] <= 0) {
                delete this.activeBoosts[id];
                const item = this.shop.itemsById[id];
                if (item) g.showToast(`${item.name} wore off`);
                // Mice turned golden by the boost go back to normal (born-golden mice stay golden)
                if (item && item.effect === 'golden') g.mice.forEach(m => m.setGolden(false));
                this.refreshBar();
            }
        }
        g.vincenzo.speedBoost = this.speedMultiplier();

        if (this.blasterCooldown > 0) this.blasterCooldown -= dt;

        for (let i = this.pellets.length - 1; i >= 0; i--) {
            const p = this.pellets[i];
            p.position.addScaledVector(p.userData.vel, dt);
            p.userData.life -= dt;

            const hit = g.mice.find(m => Math.hypot(m.position.x - p.position.x, m.position.z - p.position.z) < 0.8);
            if (hit) {
                g.particles.spawnPelletHit(p.position);
                this.removePellet(i);
                g.catchMouse(hit);
                if (!g.isRunning) return;
                continue;
            }

            if (p.userData.life <= 0 || g.room.checkCollision(p.position.x, p.position.z, 0.1)) {
                g.particles.spawnPelletHit(p.position);
                this.removePellet(i);
            }
        }

        this.updateBarTimers();
    }

    // Ends active boosts and clears flying pellets (between levels)
    reset() {
        this.activeBoosts = {};
        while (this.pellets.length > 0) this.removePellet(0);
        this.blasterCooldown = 0;
        this.game.vincenzo.speedBoost = 1;
        this.refreshBar();
    }

    // ---------- Power-up bar (HUD, clickable for touch screens) ----------

    refreshBar() {
        this.bar.innerHTML = '';
        this.slots = {};
        for (const item of this.usableItems()) {
            if (item.requires && !this.shop.isOwned(item.requires)) continue;
            if (this.shop.count(item.id) <= 0 && !(this.activeBoosts[item.id] > 0)) continue;

            const btn = document.createElement('button');
            btn.className = 'powerup-btn';
            btn.title = `${item.name} (${item.key.toUpperCase()})`;
            btn.innerHTML = `<span class="powerup-icon">${item.icon}</span><span class="powerup-count"></span><span class="key-badge">${item.key.toUpperCase()}</span>`;
            btn.addEventListener('click', () => {
                this.use(item.id);
                btn.blur();
            });
            this.bar.appendChild(btn);
            this.slots[item.id] = { btn, countEl: btn.querySelector('.powerup-count') };
        }
        this.updateBarTimers();
    }

    updateBarTimers() {
        for (const id of Object.keys(this.slots)) {
            const slot = this.slots[id];
            const remaining = this.activeBoosts[id];
            slot.btn.classList.toggle('active', remaining > 0);
            slot.countEl.textContent = remaining > 0 ? `${Math.ceil(remaining)}s` : `x${this.shop.count(id)}`;
        }
    }
}
