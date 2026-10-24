import * as THREE from 'three';
import { sound } from './sound.js';

// Yarn Ball Bomb: lands this far ahead (or on the mouse it aims at) and tangles every mouse nearby
const YARN_RANGE = 12;
const YARN_DEFAULT_DISTANCE = 7;
const YARN_RADIUS = 3.5;
const YARN_FLIGHT_TIME = 0.6;

// Mouse traps: mice within the lure radius walk to the cheese, and get caught when they reach it
const TRAP_LURE_RADIUS = 8;
const TRAP_CATCH_RADIUS = 1.4;
const MAX_TRAPS = 5;

// Super Squirter: soaks every mouse in a cone in front of the cat
const SQUIRT_RANGE = 8;
const SQUIRT_SPREAD = 0.45; // half-angle of the cone, in radians
const SQUIRT_COOLDOWN = 0.4;

// Up/down distance that still counts as a hit when the cat and mice float (zero gravity)
const FLOAT_HIT_HEIGHT = 2.5;

// --- In-Hunt Abilities: timed boosts, pepper sneeze, blaster, yarn bombs, traps and the squirter ---
export class AbilityManager {
    constructor(game) {
        this.game = game;
        this.activeBoosts = {}; // itemId -> seconds remaining
        this.pellets = [];
        this.yarnBalls = [];
        this.traps = [];
        this.blasterCooldown = 0;
        this.squirtCooldown = 0;
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

        if (item.effect === 'time') {
            // Instant: no timer, just more seconds on the clock
            if (g.isEndless) {
                g.showToast('No clock in endless mode! Save it for a level ⏰');
                return;
            }
            this.shop.consume(itemId);
            g.timeLeft += item.value;
            sound.playPowerUp();
            g.showToast(`${item.icon} +${item.value} SECONDS!`);
        } else if (item.type === 'boost') {
            if (this.activeBoosts[itemId] > 0) {
                g.showToast(`${item.name} is already active!`);
                return;
            }
            // Activate before consuming so the bar keeps showing the timer of the last one
            this.activeBoosts[itemId] = item.duration;
            this.shop.consume(itemId);
            if (item.effect === 'golden') g.mice.forEach(m => m.setGolden(true));
            if (item.effect === 'moreMice') {
                for (let i = 0; i < item.value; i++) g.spawnMouse();
            }
            sound.playPowerUp();
            g.showToast(`${item.icon} ${item.name.toUpperCase()}! (${item.duration}s)`);
        } else if (item.weapon === 'sneeze') {
            this.shop.consume(itemId);
            this.sneeze();
        } else if (item.weapon === 'blaster') {
            if (this.blasterCooldown > 0) return;
            this.shop.consume(itemId);
            this.fireBlaster();
        } else if (item.weapon === 'yarn') {
            this.shop.consume(itemId);
            this.throwYarn();
        } else if (item.weapon === 'trap') {
            if (this.traps.length >= MAX_TRAPS) {
                g.showToast(`Only ${MAX_TRAPS} traps at a time! 🪤`);
                return;
            }
            this.shop.consume(itemId);
            this.placeTrap();
        } else if (item.weapon === 'squirter') {
            if (this.squirtCooldown > 0) return;
            this.shop.consume(itemId);
            this.squirt();
        }
        this.updateBarTimers();
    }

    // Active boosts with this effect (from the shop items' "effect" field)
    activeEffects(effect) {
        return Object.keys(this.activeBoosts)
            .map(id => this.shop.itemsById[id])
            .filter(item => item && item.effect === effect);
    }

    // Biggest "value" among the active boosts with this effect, or `none` if there are none
    effectValue(effect, none) {
        const items = this.activeEffects(effect);
        return items.length > 0 ? Math.max(...items.map(i => i.value)) : none;
    }

    brokjesMultiplier() { return this.effectValue('brokjes', 1); }
    speedMultiplier() { return this.effectValue('speed', 1); }
    goldenMiceActive() { return this.activeEffects('golden').length > 0; }
    reachMultiplier() { return this.effectValue('reach', 1); }     // Magnet Paws
    miceSpeedFactor() { return this.effectValue('slowMice', 1); }  // Sleepy Mice
    miceCalm() { return this.activeEffects('calm').length > 0; }   // Cheese Lure
    extraMice() { return this.effectValue('moreMice', 0); }        // Mouse Party
    luckyChance() { return this.effectValue('lucky', 0); }         // Lucky Clover

    // Forward direction of the cat on the floor plane
    catForward() {
        const cat = this.game.vincenzo;
        return new THREE.Vector3(-Math.sin(cat.rotationY), 0, -Math.cos(cat.rotationY));
    }

    // Close enough up/down to be hit (always true when everyone stands on the floor)
    sameHeight(mouse) {
        return Math.abs(mouse.position.y - this.game.vincenzo.position.y) < FLOAT_HIT_HEIGHT;
    }

    // Mice the player can currently see on screen (inside the camera's view)
    miceInView() {
        const cam = this.game.camera;
        cam.updateMatrixWorld();
        const frustum = new THREE.Frustum().setFromProjectionMatrix(
            new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse)
        );
        const point = new THREE.Vector3();
        return this.game.mice.filter(m => frustum.containsPoint(point.set(m.position.x, m.position.y + 0.2, m.position.z)));
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

    // Closest mouse roughly in front of the cat (for auto-aim), or null
    aimTarget(maxDist, maxAngle) {
        const g = this.game;
        const cat = g.vincenzo;
        const dir = this.catForward();
        let best = null;
        let bestDist = Infinity;
        for (const m of g.mice) {
            const toMouse = new THREE.Vector3(m.position.x - cat.position.x, 0, m.position.z - cat.position.z);
            const dist = toMouse.length();
            if (dist < 0.01 || dist > maxDist) continue;
            if (dir.angleTo(toMouse) < maxAngle && dist < bestDist) {
                bestDist = dist;
                best = m;
            }
        }
        return best;
    }

    fireBlaster() {
        const g = this.game;
        const cat = g.vincenzo;
        const dir = this.catForward();
        const start = new THREE.Vector3(cat.position.x + dir.x * 0.9, cat.position.y + 0.45, cat.position.z + dir.z * 0.9);

        // Gentle auto-aim at the closest mouse roughly in front of the cat (also up/down when floating)
        const target = this.aimTarget(22, 0.35);
        if (target) dir.set(target.position.x, target.position.y + 0.2, target.position.z).sub(start).normalize();

        const pellet = new THREE.Mesh(this.pelletGeo, this.pelletMat);
        pellet.position.copy(start);
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

    // Throws a yarn ball in a high arc; it tangles every mouse near the landing spot
    throwYarn() {
        const g = this.game;
        const cat = g.vincenzo;
        const target = this.aimTarget(YARN_RANGE, 0.5);
        const dir = this.catForward();
        const to = target
            ? new THREE.Vector3(target.position.x, target.position.y, target.position.z)
            : new THREE.Vector3(cat.position.x + dir.x * YARN_DEFAULT_DISTANCE, cat.position.y, cat.position.z + dir.z * YARN_DEFAULT_DISTANCE);
        const bound = (size) => size / 2 - 1;
        to.x = Math.max(-bound(g.room.roomWidth), Math.min(bound(g.room.roomWidth), to.x));
        to.z = Math.max(-bound(g.room.roomDepth), Math.min(bound(g.room.roomDepth), to.z));

        const ball = new THREE.Group();
        const wool = new THREE.MeshStandardMaterial({ color: 0xff6b9d, roughness: 0.9 });
        ball.add(new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 10), wool));
        const strandMat = new THREE.MeshStandardMaterial({ color: 0xffb8d1, roughness: 0.9 });
        [0, 1, 2].forEach(i => {
            const strand = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.025, 4, 16), strandMat);
            strand.rotation.set(i * 1.1, i * 0.7, 0);
            ball.add(strand);
        });
        const from = new THREE.Vector3(cat.position.x, cat.position.y + 0.7, cat.position.z);
        ball.position.copy(from);
        ball.userData = { from, to, time: 0 };
        g.scene.add(ball);
        this.yarnBalls.push(ball);
        sound.playThrow();
    }

    landYarn(ball) {
        const g = this.game;
        const to = ball.userData.to;
        g.particles.spawnCatchBurst(to, [0xff6b9d, 0xffb8d1, 0xffffff, 0xa29bfe]);
        const hits = g.mice.filter(m => Math.hypot(m.position.x - to.x, m.position.z - to.z) < YARN_RADIUS);
        let earned = 0;
        for (const mouse of hits) {
            if (!g.isRunning) break;
            earned += g.catchMouse(mouse, { silent: true });
        }
        if (hits.length > 0) {
            sound.playCatchSuccess();
            if (g.isRunning) g.showToast(`TANGLED! ${hits.length} ${hits.length === 1 ? 'MOUSE' : 'MICE'}! +${earned} BROKJES 🧶`);
        } else {
            g.showToast('The yarn ball missed! 🧶');
        }
    }

    // Puts a cheesy mouse trap on the floor under the cat
    placeTrap() {
        const g = this.game;
        const cat = g.vincenzo;
        const trap = new THREE.Group();
        const wood = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.08, 0.5), new THREE.MeshStandardMaterial({ color: 0xd4a373, roughness: 0.8 }));
        wood.position.y = 0.04;
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.04, 0.04), new THREE.MeshStandardMaterial({ color: 0xb2bec3, metalness: 0.7, roughness: 0.3 }));
        bar.position.set(0, 0.1, -0.15);
        const cheese = new THREE.Mesh(
            new THREE.CylinderGeometry(0.18, 0.18, 0.14, 12, 1, false, 0, Math.PI / 2),
            new THREE.MeshStandardMaterial({ color: 0xf9ca24, roughness: 0.5, emissive: 0x7a5c00, emissiveIntensity: 0.3 })
        );
        cheese.position.set(0, 0.15, 0.08);
        trap.add(wood, bar, cheese);
        trap.position.set(cat.position.x, 0, cat.position.z);
        trap.rotation.y = cat.rotationY;
        trap.traverse(o => { if (o.isMesh) o.castShadow = true; });
        g.scene.add(trap);
        this.traps.push(trap);
        sound.playPounce();
        g.showToast('Trap set! Now step away... 🪤');
    }

    removeTrap(index) {
        this.game.scene.remove(this.traps[index]);
        this.traps.splice(index, 1);
    }

    // Sprays water in a cone in front of the cat
    squirt() {
        const g = this.game;
        const cat = g.vincenzo;
        const dir = this.catForward();
        const nozzle = new THREE.Vector3(cat.position.x + dir.x * 0.8, cat.position.y + 0.6, cat.position.z + dir.z * 0.8);
        g.particles.spawnSplash(nozzle, dir, SQUIRT_SPREAD);
        sound.playSplash();
        this.squirtCooldown = SQUIRT_COOLDOWN;

        const hits = g.mice.filter(m => {
            const toMouse = new THREE.Vector3(m.position.x - cat.position.x, 0, m.position.z - cat.position.z);
            const dist = toMouse.length();
            return dist < SQUIRT_RANGE && (dist < 1 || dir.angleTo(toMouse) < SQUIRT_SPREAD) && this.sameHeight(m);
        });
        let earned = 0;
        for (const mouse of hits) {
            if (!g.isRunning) break;
            earned += g.catchMouse(mouse, { silent: true });
        }
        if (hits.length > 0) {
            sound.playCatchSuccess();
            if (g.isRunning) g.showToast(`SPLASH! ${hits.length} ${hits.length === 1 ? 'MOUSE' : 'MICE'} SOAKED! +${earned} BROKJES 💦`);
        }
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
        if (this.squirtCooldown > 0) this.squirtCooldown -= dt;

        for (let i = this.pellets.length - 1; i >= 0; i--) {
            const p = this.pellets[i];
            p.position.addScaledVector(p.userData.vel, dt);
            p.userData.life -= dt;

            const hit = g.mice.find(m =>
                Math.hypot(m.position.x - p.position.x, m.position.z - p.position.z) < 0.8 &&
                Math.abs(m.position.y + 0.2 - p.position.y) < 1.2);
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

        // Yarn balls fly in an arc and burst when they land
        for (let i = this.yarnBalls.length - 1; i >= 0; i--) {
            const ball = this.yarnBalls[i];
            const u = ball.userData;
            u.time += dt;
            const p = Math.min(1, u.time / YARN_FLIGHT_TIME);
            ball.position.lerpVectors(u.from, u.to, p);
            ball.position.y += Math.sin(p * Math.PI) * 3;
            ball.rotation.x += dt * 12;
            if (p >= 1) {
                g.scene.remove(ball);
                this.yarnBalls.splice(i, 1);
                this.landYarn(ball);
                if (!g.isRunning) return;
            }
        }

        // Traps lure roaming mice to the cheese and snap shut when one arrives
        for (let i = this.traps.length - 1; i >= 0; i--) {
            const trap = this.traps[i];
            let caught = null;
            for (const m of g.mice) {
                const d = Math.hypot(m.position.x - trap.position.x, m.position.z - trap.position.z);
                if (d < TRAP_CATCH_RADIUS) { caught = m; break; }
                if (d < TRAP_LURE_RADIUS) m.lure(trap.position.x, trap.position.z);
            }
            if (caught) {
                sound.playTrapSnap();
                g.particles.spawnPelletHit(trap.position.clone().setY(0.3));
                this.removeTrap(i);
                g.catchMouse(caught);
                if (!g.isRunning) return;
            }
        }

        this.updateBarTimers();
    }

    // Removes flying pellets, yarn balls and traps (level end, or moving to another room)
    clearProjectiles() {
        while (this.pellets.length > 0) this.removePellet(0);
        while (this.traps.length > 0) this.removeTrap(0);
        this.yarnBalls.forEach(ball => this.game.scene.remove(ball));
        this.yarnBalls = [];
    }

    // Ends active boosts and clears pellets, yarn balls and traps (between levels)
    reset() {
        this.activeBoosts = {};
        this.clearProjectiles();
        this.blasterCooldown = 0;
        this.squirtCooldown = 0;
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
