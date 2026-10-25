import { Cat } from './cat.js';
import { sound } from './sound.js';

// Cat Army Horn: cats from the shop come running and hunt mice on their own for a while.
// They steer with the same controls as the player's cat (Cat.update), so they walk,
// sprint, float and bump into furniture just like Vincenzo.
const HELPER_CATCH_RADIUS = 1.8;
const HELPER_SPRINT_SPEED = 15;
const FOLLOW_DISTANCE = 3;  // without mice to chase, helpers stay this close to the player's cat
const STUCK_TIME = 0.6;     // seconds stuck against furniture before a helper turns away
const ESCAPE_TIME = 0.5;    // ...and for how long it turns away
const TAKEN_PENALTY = 8;    // helpers prefer mice that no other helper is chasing
const ARMY_COLORS = [0xffd32a, 0xff4757, 0x48dbfb, 0x2ed573, 0xffffff];

export class CatArmy {
    constructor(game) {
        this.game = game;
        this.helpers = []; // { cat, input, target, stuck, escape }
        this.timeLeft = 0;
    }

    get active() { return this.helpers.length > 0; }

    // Calls a random squad of shop cats (never the cat being played)
    summon(item) {
        const g = this.game;
        const playing = g.shop.data.selectedCat;
        const cats = g.shop.catalog.items
            .filter(i => i.type === 'cat' && i.id !== playing)
            .sort(() => Math.random() - 0.5)
            .slice(0, item.helpers || 6);
        cats.forEach(catItem => {
            const cat = new Cat(g.scene, {
                name: catItem.name,
                fur: parseInt(catItem.fur, 16),
                spots: parseInt(catItem.spots, 16),
                eyes: parseInt(catItem.eyes, 16),
                pattern: catItem.pattern || 'spots'
            });
            cat.sprintSpeed = HELPER_SPRINT_SPEED;
            const input = { forward: false, backward: false, turnLeft: false, turnRight: false, sprint: false, up: false, down: false };
            this.helpers.push({ cat, input, target: null, stuck: 0, escape: 0 });
        });
        this.timeLeft = item.duration || 30;
        this.regroup();
        this.helpers.forEach(h => g.particles.spawnCatchBurst(h.cat.position, ARMY_COLORS));
        sound.playCatArmy();
        g.showToast('📯 CAT ARMY! GET THOSE MICE! 🐱🐱🐱');
    }

    // Puts the helpers in a circle around the player's cat (when summoned, and after changing room)
    regroup() {
        const g = this.game;
        const p = g.vincenzo.position;
        this.helpers.forEach((h, i) => {
            const a = (i / this.helpers.length) * Math.PI * 2;
            const spot = g.room.findFreeSpot(p.x + Math.sin(a) * 2.5, p.z + Math.cos(a) * 2.5, 0.6);
            h.cat.position.set(spot.x, g.room.zeroGravity ? p.y : 0, spot.z);
            h.cat.rotationY = a + Math.PI; // facing away from the player
            h.cat.speed = 0;
            h.target = null;
            h.cat.update(0, h.input, g.room);
        });
    }

    // The helpers go home in a puff of stars
    dismiss() {
        this.helpers.forEach(h => {
            this.game.particles.spawnCatchBurst(h.cat.position, ARMY_COLORS);
            this.game.scene.remove(h.cat.mesh);
        });
        this.helpers = [];
        this.timeLeft = 0;
    }

    // The closest mouse, preferring one that no other helper is after
    pickTarget(helper) {
        const taken = new Set(this.helpers.filter(h => h !== helper && h.target).map(h => h.target));
        let best = null;
        let bestScore = Infinity;
        for (const m of this.game.mice) {
            if (m.state === 'CAUGHT') continue;
            const score = m.position.distanceTo(helper.cat.position) + (taken.has(m) ? TAKEN_PENALTY : 0);
            if (score < bestScore) {
                bestScore = score;
                best = m;
            }
        }
        return best;
    }

    update(dt) {
        if (!this.active) return;
        const g = this.game;
        this.timeLeft -= dt;
        if (this.timeLeft <= 0) {
            this.dismiss();
            g.showToast('The Cat Army goes home. Thanks, friends! 🫡');
            return;
        }

        for (const h of this.helpers) {
            const cat = h.cat;
            if (h.target && !g.mice.includes(h.target)) h.target = null;
            // Look around for a closer mouse about once a second
            if (!h.target || Math.random() < dt) h.target = this.pickTarget(h);

            const goal = h.target ? h.target.position : g.vincenzo.position;
            const dx = goal.x - cat.position.x;
            const dz = goal.z - cat.position.z;
            let diff = Math.atan2(-dx, -dz) - cat.rotationY;
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;

            const input = h.input;
            if (h.escape > 0) {
                h.escape -= dt;
                input.turnLeft = false;
                input.turnRight = true;
                input.forward = true;
            } else {
                input.turnLeft = diff > 0.08;
                input.turnRight = diff < -0.08;
                const far = h.target || Math.hypot(dx, dz) > FOLLOW_DISTANCE;
                input.forward = far && Math.abs(diff) < 1.3;
            }
            input.sprint = !!h.target;
            input.up = g.room.zeroGravity && goal.y > cat.position.y + 0.3;
            input.down = g.room.zeroGravity && goal.y < cat.position.y - 0.3;

            const beforeX = cat.position.x;
            const beforeZ = cat.position.z;
            cat.stamina = cat.maxStamina;
            cat.update(dt, input, g.room);

            // Bumping into furniture: turn away for a moment and try again
            const moved = Math.hypot(cat.position.x - beforeX, cat.position.z - beforeZ);
            if (input.forward && h.escape <= 0 && moved < dt * 0.8) {
                h.stuck += dt;
                if (h.stuck > STUCK_TIME) {
                    h.stuck = 0;
                    h.escape = ESCAPE_TIME;
                }
            } else {
                h.stuck = 0;
            }

            if (h.target && h.target.position.distanceTo(cat.position) < HELPER_CATCH_RADIUS) {
                const mouse = h.target;
                h.target = null;
                cat.triggerPounce();
                const earned = g.catchMouse(mouse, { silent: true });
                sound.playCatchSuccess();
                if (!g.isRunning) return;
                g.showToast(`${cat.appearance.name.toUpperCase()} CAUGHT ONE! +${earned} BROKJES 🐾`);
            }
        }
    }
}
