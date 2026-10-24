import * as THREE from 'three';
import { sound } from './sound.js';
import { ParticleManager } from './particles.js';
import { LevelEnvironment } from './environment.js';
import { Cat } from './cat.js';
import { Mouse } from './mouse.js';
import { Shop, colorToCss } from './shop.js';
import { AbilityManager } from './abilities.js';
import { AccountStore, AccountPicker } from './accounts.js';
import { buildPassage, passageType } from './passages.js';

// Golden mouse defaults (levels.json can override per level)
const DEFAULT_GOLDEN_CHANCE = 0.12;  // chance that a newly spawned mouse is golden
const DEFAULT_GOLDEN_REWARD = 50;    // brokjes for catching one
const CATCH_RADIUS = 3.2;
const LUCKY_MAX_GOLDEN = 3;          // golden mice at the same time while the Lucky Clover is on
const FADE_TIME = 250;               // ms the screen takes to fade out when changing room

const PASSAGE_NAMES = {
    corridor: '🚪 Hallway',
    stairs: '🪜 Stairs',
    path: '🌼 Garden Path',
    road: '🛣️ Road',
    teleport: '🌀 Teleporter'
};

// A wall spot for an automatically added door, away from the doors already there
function freeDoorSpot(doors) {
    for (const at of [0, -7, 7]) {
        for (const wall of ['east', 'west', 'north', 'south']) {
            if (!doors.some(d => d.wall === wall && Math.abs(d.at - at) < 5)) return { wall, at };
        }
    }
    return { wall: 'north', at: -12 };
}

class VincenzoGame {
    get score() { return this.brokjes; }
    set score(val) { this.brokjes = val; }

    // Brokjes live in the shop's saved wallet so they survive reloads
    get brokjes() { return this.shop.wallet; }
    set brokjes(val) { this.shop.wallet = val; }

    constructor() {
        this.container = document.getElementById('canvas-container');
        this.hud = {
            score: document.getElementById('hud-score'),
            caught: document.getElementById('hud-caught'),
            mice: document.getElementById('hud-mice'),
            timer: document.getElementById('hud-timer'),
            staminaBar: document.getElementById('stamina-bar'),
            comboPopup: document.getElementById('combo-popup'),
            toastBanner: document.getElementById('toast-banner'),
            catchHint: document.getElementById('catch-action-hint'),
            levelName: document.getElementById('hud-level-name'),
            radarRoomTitle: document.getElementById('radar-room-title')
        };

        this.screens = {
            start: document.getElementById('start-screen'),
            levelComplete: document.getElementById('level-complete-screen'),
            gameOver: document.getElementById('game-over-screen'),
            pause: document.getElementById('pause-screen')
        };

        // Default level configs (fallback if fetch fails or before fetch resolves)
        this.levelConfigs = {
            1: { id: 1, icon: '🛋️', name: 'Living Room', environment: 'environments/living_room.json', target: 10, duration: 180, time: 180, miceCount: 3, speedMult: 1.0, brokjesPerMouse: 10, completionBrokjes: 50, goldenMouseChance: 0.12, goldenMouseBrokjes: 50, clearIcon: '🎉 🛋️', clearTitle: 'Level 1 Cleared!', clearMsg: 'Living Room is clear! But mice are scurrying upstairs in the dusty Attic!', nextBtnText: 'Enter Level 2: The Attic (15 Mice)' },
            2: { id: 2, icon: '📦', name: 'The Attic', environment: 'environments/attic.json', target: 15, duration: 150, time: 150, miceCount: 5, speedMult: 1.2, brokjesPerMouse: 10, completionBrokjes: 100, goldenMouseChance: 0.12, goldenMouseBrokjes: 60, clearIcon: '📦 🌟', clearTitle: 'Level 2 Cleared!', clearMsg: 'The Attic is safe! But a massive infestation is swarming in the dark Basement!', nextBtnText: 'Enter Level 3: The Basement (20 Mice)' },
            3: { id: 3, icon: '🛢️', name: 'The Basement', environment: 'environments/basement.json', target: 20, duration: 120, time: 120, miceCount: 6, speedMult: 1.35, brokjesPerMouse: 10, completionBrokjes: 200, goldenMouseChance: 0.15, goldenMouseBrokjes: 80, clearIcon: '🔥 🛢️', clearTitle: 'Level 3 Cleared!', clearMsg: 'The Basement is quiet! But a hungry gang of mice has raided the Kitchen and is going after the cheese!', nextBtnText: 'Enter Level 4: The Kitchen (25 Mice)' },
            4: { id: 4, icon: '🍳', name: 'The Kitchen', environment: 'environments/kitchen.json', target: 25, duration: 120, time: 120, miceCount: 8, speedMult: 1.5, brokjesPerMouse: 10, completionBrokjes: 300, goldenMouseChance: 0.18, goldenMouseBrokjes: 100, clearIcon: '🧀 🍳', clearTitle: 'Level 4 Cleared!', clearMsg: "The Kitchen is safe! But it's bedtime and an army of mice is sneaking into the dark Bedroom!", nextBtnText: 'Enter Level 5: The Bedroom (30 Mice)' },
            5: { id: 5, icon: '🛏️', name: 'The Bedroom', environment: 'environments/bedroom.json', target: 30, duration: 120, time: 120, miceCount: 10, speedMult: 1.65, brokjesPerMouse: 10, completionBrokjes: 400, goldenMouseChance: 0.2, goldenMouseBrokjes: 120, clearIcon: '🌙 🛏️', clearTitle: 'Level 5 Cleared!', clearMsg: 'The whole house is mouse-free! But the mice have escaped outside into the sunny Backyard!', nextBtnText: 'Enter Level 6: The Backyard (30 Mice)' },
            6: { id: 6, icon: '🌳', name: 'The Backyard', environment: 'environments/backyard.json', target: 30, duration: 120, time: 120, miceCount: 10, speedMult: 1.7, brokjesPerMouse: 12, completionBrokjes: 500, goldenMouseChance: 0.2, goldenMouseBrokjes: 130, clearIcon: '🌳 🐶', clearTitle: 'Level 6 Cleared!', clearMsg: 'The Backyard is safe! But the mice ran off to hide in the creepy Abandoned Workshop down the road!', nextBtnText: 'Enter Level 7: The Abandoned Workshop (32 Mice)' },
            7: { id: 7, icon: '🔧', name: 'The Abandoned Workshop', environment: 'environments/workshop.json', target: 32, duration: 120, time: 120, miceCount: 11, speedMult: 1.75, brokjesPerMouse: 12, completionBrokjes: 600, goldenMouseChance: 0.2, goldenMouseBrokjes: 140, clearIcon: '🔧 🚗', clearTitle: 'Level 7 Cleared!', clearMsg: 'The Workshop is quiet again! But the mice smelled cheese and invaded the Supermarket!', nextBtnText: 'Enter Level 8: The Supermarket (35 Mice)' },
            8: { id: 8, icon: '🛒', name: 'The Supermarket', environment: 'environments/supermarket.json', target: 35, duration: 120, time: 120, miceCount: 12, speedMult: 1.85, brokjesPerMouse: 12, completionBrokjes: 750, goldenMouseChance: 0.22, goldenMouseBrokjes: 150, clearIcon: '🛒 🧀', clearTitle: 'Level 8 Cleared!', clearMsg: 'The Supermarket is clean! But the mice stowed away on a Boat sailing out to sea!', nextBtnText: 'Enter Level 9: The Boat (38 Mice)' },
            9: { id: 9, icon: '⛵', name: 'The Boat', environment: 'environments/boat.json', target: 38, duration: 130, time: 130, miceCount: 12, speedMult: 1.9, brokjesPerMouse: 15, completionBrokjes: 900, goldenMouseChance: 0.22, goldenMouseBrokjes: 160, clearIcon: '⛵ 🌊', clearTitle: 'Level 9 Cleared!', clearMsg: 'The Boat is safe! But the last mice took off in a rocket to a Spaceship... without gravity!', nextBtnText: 'Enter Level 10: The Spaceship (40 Mice)' },
            10: { id: 10, icon: '🚀', name: 'The Spaceship', environment: 'environments/spaceship.json', target: 40, duration: 150, time: 150, miceCount: 12, speedMult: 1.8, brokjesPerMouse: 15, completionBrokjes: 1200, goldenMouseChance: 0.25, goldenMouseBrokjes: 200, clearIcon: '👑 🚀 🐱', clearTitle: 'GALACTIC CHAMPION VINCENZO!', clearMsg: 'All 10 levels conquered! From the living room to outer space, Vincenzo is the greatest mouse hunter in the universe!', nextBtnText: 'Play Again from Level 1' }
        };

        // Endless mode: a house of rooms connected by doors (endless.json)
        this.endlessConfig = null;
        this.endlessRoomId = null;
        this.roomChanging = false; // true while the next room is loading
        this.doorCooldown = 0;
        this.roomsVisited = 0;
        this.passage = null;       // { from, to } while walking from one room to the next
        this.foundSecrets = new Set(); // hidden doors found in this hunt ("room>otherRoom")
        this.endlessSynced = false;
        this.huntBrokjes = 0;      // brokjes earned in the current hunt
        this.mode = 'levels';      // 'levels' or 'endless'

        this.currentLevel = 1;
        this.isRunning = false;
        this.isPaused = false;
        this.miceCaught = 0;
        this.timeLeft = 180;
        this.combo = 0;
        this.comboTimer = 0;

        this.mice = [];
        this.cameraMode = 0;

        this.accounts = new AccountStore();
        this.shop = new Shop({
            onWalletChange: () => this.updateWalletDisplay(),
            onAppearanceChange: () => this.applyCatAppearance(),
            onInventoryChange: () => this.abilities.refreshBar(),
            onOpen: () => this.onShopOpen(),
            onClose: () => this.onShopClose()
        }, this.accounts);
        this.accountPicker = new AccountPicker(this.accounts, () => this.onAccountSwitch());

        this.initThree();
        this.initWorld();
        this.abilities = new AbilityManager(this);
        this.initInputs();
        this.setupUI();
        this.loadLevelConfigs();
        this.loadEndlessConfig();
        this.shop.loadCatalog();
        this.updateWalletDisplay();
        this.renderAccounts();

        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.loop(t));
    }

    initThree() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x12141a);
        this.scene.fog = new THREE.FogExp2(0x12141a, 0.018);

        this.camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 150);
        this.camera.position.set(0, 4, 8);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    initWorld() {
        this.room = new LevelEnvironment(this.scene);
        // Initial build without a config — environment will load once levelConfigs are fetched
        this.room.buildLevel(1, null);

        this.vincenzo = new Cat(this.scene, this.shop.getAppearance());
        this.particles = new ParticleManager(this.scene);
        this.radarCanvas = document.getElementById('radar-canvas');
        this.radarCtx = this.radarCanvas.getContext('2d');
    }

    initInputs() {
        this.input = {
            forward: false,
            backward: false,
            turnLeft: false,
            turnRight: false,
            sprint: false,
            up: false,   // float up (zero gravity)
            down: false  // float down (zero gravity)
        };

        window.addEventListener('keydown', (e) => {
            // Typing a player name must not move the cat or toggle sound
            if (e.target.closest && e.target.closest('input, textarea')) return;

            const k = e.key.toLowerCase();

            // While the shop is open, only Escape works (closes the shop)
            if (this.shop.isOpen) {
                if (k === 'escape') this.shop.close();
                return;
            }

            // Shop boosts & weapons (digits via e.code so Shift+1 still works)
            const abilityKey = e.code && e.code.startsWith('Digit') ? e.code.slice(5) : k;
            if (this.abilities.handleKey(abilityKey)) return;

            if (k === 'w' || k === 'arrowup') this.input.forward = true;
            if (k === 's' || k === 'arrowdown') this.input.backward = true;
            if (k === 'a' || k === 'arrowleft') this.input.turnLeft = true;
            if (k === 'd' || k === 'arrowright') this.input.turnRight = true;
            if (e.shiftKey) this.input.sprint = true;
            if (k === 'q' || k === 'pageup') this.input.up = true;
            if (k === 'z' || k === 'pagedown') this.input.down = true;
            
            // SPACEBAR: DEDICATED CATCH KEY!
            if (k === ' ' || e.code === 'Space') {
                e.preventDefault();
                this.attemptCatch();
            }
            
            if (k === 'c') this.cycleCamera();
            if (k === 'm') this.toggleSound();
            if (k === 'p' || k === 'escape') this.togglePause();
        });

        window.addEventListener('keyup', (e) => {
            const k = e.key.toLowerCase();
            if (k === 'w' || k === 'arrowup') this.input.forward = false;
            if (k === 's' || k === 'arrowdown') this.input.backward = false;
            if (k === 'a' || k === 'arrowleft') this.input.turnLeft = false;
            if (k === 'd' || k === 'arrowright') this.input.turnRight = false;
            if (!e.shiftKey) this.input.sprint = false;
            if (k === 'q' || k === 'pageup') this.input.up = false;
            if (k === 'z' || k === 'pagedown') this.input.down = false;
        });

        window.addEventListener('pointerdown', (e) => {
            if (e.target.closest('#hud') || e.target.closest('.overlay-screen') || e.target.closest('#shop-btn')) return;
            this.attemptCatch();
        });

        // Touch Joystick
        const dpad = document.getElementById('touch-dpad');
        const stick = document.getElementById('touch-stick');
        let touchActive = false;
        let dpadCenter = { x: 0, y: 0 };

        const handleTouch = (clientX, clientY) => {
            const dx = clientX - dpadCenter.x;
            const dy = clientY - dpadCenter.y;
            const dist = Math.min(45, Math.hypot(dx, dy));
            const angle = Math.atan2(dy, dx);

            stick.style.transform = `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist}px)`;

            this.input.forward = dy < -15;
            this.input.backward = dy > 15;
            this.input.turnLeft = dx < -15;
            this.input.turnRight = dx > 15;
        };

        dpad.addEventListener('touchstart', (e) => {
            touchActive = true;
            const rect = dpad.getBoundingClientRect();
            dpadCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
            handleTouch(e.touches[0].clientX, e.touches[0].clientY);
        });

        dpad.addEventListener('touchmove', (e) => {
            if (touchActive) handleTouch(e.touches[0].clientX, e.touches[0].clientY);
        });

        const resetTouch = () => {
            touchActive = false;
            stick.style.transform = 'translate(0px, 0px)';
            this.input.forward = false;
            this.input.backward = false;
            this.input.turnLeft = false;
            this.input.turnRight = false;
        };
        dpad.addEventListener('touchend', resetTouch);
        dpad.addEventListener('touchcancel', resetTouch);

        // Touch buttons
        const btnPounce = document.getElementById('btn-touch-pounce');
        btnPounce.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.attemptCatch();
        });

        const btnSprint = document.getElementById('btn-touch-sprint');
        btnSprint.addEventListener('touchstart', (e) => { e.preventDefault(); this.input.sprint = true; });
        btnSprint.addEventListener('touchend', () => { this.input.sprint = false; });

        // Float up/down buttons (only shown in zero gravity)
        [['btn-touch-up', 'up'], ['btn-touch-down', 'down']].forEach(([id, key]) => {
            const btn = document.getElementById(id);
            btn.addEventListener('touchstart', (e) => { e.preventDefault(); this.input[key] = true; });
            btn.addEventListener('touchend', () => { this.input[key] = false; });
        });
    }

    get isEndless() { return this.mode === 'endless'; }

    // Settings of what is being played: the current level, or the current room of the endless house
    levelConfig() {
        if (this.isEndless && this.endlessConfig) {
            const room = this.endlessConfig.rooms[this.endlessRoomId] || {};
            const { rooms, doors, ...shared } = { ...this.endlessConfig, ...room };
            return shared;
        }
        return this.levelConfigs[this.currentLevel] || this.levelConfigs[String(this.currentLevel)];
    }

    sortedLevels() {
        return Object.keys(this.levelConfigs).map(k => parseInt(k, 10)).sort((a, b) => a - b);
    }

    // The level the current player continues from (the last one picked, or the next after a cleared one)
    campaignLevel() {
        const next = this.shop.nextLevel;
        return this.levelConfigs[next] ? next : this.sortedLevels()[0];
    }

    catchRadius() {
        return CATCH_RADIUS * this.abilities.reachMultiplier();
    }

    formatDurationText(seconds) {
        if (seconds === 60) return '1 minute';
        if (seconds % 60 === 0) return `${seconds / 60} minutes`;
        if (seconds % 30 === 0) return `${(seconds / 60).toFixed(1).replace('.0', '')} minutes`;
        return `${seconds}s`;
    }

    formatTime(seconds) {
        const total = Math.max(0, Math.ceil(seconds));
        const mins = Math.floor(total / 60);
        const secs = total % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }

    async loadLevelConfigs() {
        try {
            const response = await fetch('levels.json');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();
            if (Array.isArray(data)) {
                const map = {};
                data.forEach((lvl, idx) => {
                    map[lvl.id || (idx + 1)] = lvl;
                });
                this.levelConfigs = map;
            } else {
                this.levelConfigs = data;
            }
        } catch (err) {
            console.warn('Could not load external levels.json, using fallback configuration:', err);
        }
        this.updateStartScreenFromConfig();
    }

    async loadEndlessConfig() {
        try {
            const response = await fetch('endless.json');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            this.endlessConfig = await response.json();
        } catch (err) {
            console.warn('Could not load endless.json, endless mode is not available:', err);
        }
        document.getElementById('start-endless-btn').disabled = !this.endlessConfig;
    }

    updateStartScreenFromConfig() {
        // The level list starts at the level the player continues from, but any level can be picked
        this.currentLevel = this.campaignLevel();
        const next = this.levelConfigs[this.currentLevel];
        const completed = this.shop.completedLevels;
        this.levelSelect.innerHTML = '';
        this.sortedLevels().forEach((lvlKey) => {
            const cfg = this.levelConfigs[lvlKey];
            const option = document.createElement('option');
            option.value = lvlKey;
            option.textContent = `${cfg.icon || '🐭'} Level ${lvlKey}: ${cfg.name} (${cfg.target} mice)${completed.includes(lvlKey) ? ' ✅' : ''}`;
            this.levelSelect.appendChild(option);
        });
        this.levelSelect.value = this.currentLevel;
        this.updateLevelButton();

        const missionBox = document.getElementById('start-mission-desc');
        if (missionBox) {
            let html = '<strong>Campaign Rules:</strong><ul>';
            this.sortedLevels().forEach((lvlKey) => {
                const cfg = this.levelConfigs[lvlKey];
                const done = completed.includes(lvlKey) ? ' ✅' : '';
                const durText = this.formatDurationText(cfg.duration || cfg.time || 60);
                const extra = cfg.speedMult > 1.25 ? ' (intense swarm!)' : (cfg.speedMult > 1.0 ? ' (faster mice!)' : '');
                const bonus = cfg.completionBrokjes !== undefined ? cfg.completionBrokjes : (cfg.bonusBrokjes || 0);
                const bonusStr = bonus > 0 ? ` (+${bonus} bonus brokjes)` : '';
                html += `<li>Level ${lvlKey} (${cfg.name}): Catch <strong>${cfg.target} mice</strong> in ${durText}${extra}${bonusStr}.${done}</li>`;
            });
            html += '<li>Pick any level from the list to start with. When you clear a level, the next one follows. After the last level you start again from Level 1.</li>';
            html += '<li>♾️ <strong>Endless mode</strong>: no clock and no target. Walk through the glowing doors, down hallways, stairs, garden paths and even a teleporter to visit all the places! Some ways out are 🔍 <strong>secret</strong>...</li>';
            html += '<li>Each mouse caught awards <strong>brokjes</strong>. A rare ✨ <strong>golden mouse</strong> is faster but worth much more!</li>';
            html += '<li>Press <strong>SPACEBAR</strong> when near a mouse to pounce and catch it!</li>';
            html += '<li>Spend your brokjes in the <strong>🛒 Shop</strong> (top-left): new cats, boosts, sneezes, a blaster and clothes!</li></ul>';
            missionBox.innerHTML = html;
        }

        if (!this.isRunning) {
            this.timeLeft = next.duration || next.time || 180;
            this.updateHUD();
        }
    }

    selectedLevel() {
        return parseInt(this.levelSelect.value, 10) || this.campaignLevel();
    }

    updateLevelButton() {
        document.getElementById('start-levels-btn-text').textContent = `Play Level ${this.selectedLevel()}`;
    }

    setupUI() {
        this.levelSelect = document.getElementById('level-select');
        this.levelSelect.addEventListener('change', () => this.updateLevelButton());
        this.fadeEl = document.getElementById('room-fade');

        document.getElementById('start-levels-btn').addEventListener('click', () => {
            sound.init();
            this.startLevel(this.selectedLevel());
        });

        document.getElementById('start-endless-btn').addEventListener('click', () => {
            sound.init();
            this.startEndless();
        });

        // After a level is cleared the progress already points at the next level (or back to 1)
        document.getElementById('next-level-btn').addEventListener('click', () => {
            this.startLevel(this.campaignLevel());
        });

        document.getElementById('retry-level-btn').addEventListener('click', () => {
            if (this.isEndless) this.startEndless();
            else this.startLevel(this.currentLevel);
        });

        document.getElementById('stop-endless-btn').addEventListener('click', () => this.endEndless());

        document.getElementById('resume-game-btn').addEventListener('click', () => {
            this.togglePause();
        });

        document.querySelectorAll('[data-main-menu]').forEach(btn => {
            btn.addEventListener('click', () => this.goToMainMenu());
        });

        document.getElementById('btn-camera').addEventListener('click', () => this.cycleCamera());
        document.getElementById('btn-sound').addEventListener('click', () => this.toggleSound());
        document.getElementById('btn-pause').addEventListener('click', () => this.togglePause());
        document.getElementById('shop-btn').addEventListener('click', (e) => {
            sound.init();
            this.shop.open();
            e.currentTarget.blur();
        });
    }

    // Back to the start screen (to pick another level or player)
    goToMainMenu() {
        this.isRunning = false;
        this.isPaused = false;
        this.abilities.reset();
        this.hud.catchHint.classList.remove('active');
        this.screens.levelComplete.style.display = 'none';
        this.screens.gameOver.style.display = 'none';
        this.screens.pause.style.display = 'none';
        this.screens.start.style.display = 'flex';
        this.fadeEl.style.opacity = '0';
        this.updateStartScreenFromConfig();
        this.renderAccounts();
    }

    renderAccounts() {
        this.accountPicker.render(account => Shop.normalizeSave(account.data).brokjes);
    }

    onAccountSwitch() {
        this.shop.reloadAccount();
        this.renderAccounts();
        this.updateStartScreenFromConfig(); // each player has their own level progress
    }

    // Opening the shop mid-hunt pauses the game; closing it resumes (unless paused before)
    onShopOpen() {
        this.pausedBeforeShop = this.isPaused;
        if (this.isRunning) this.isPaused = true;
    }

    onShopClose() {
        if (this.isRunning && !this.pausedBeforeShop) this.isPaused = false;
    }

    updateWalletDisplay() {
        document.getElementById('shop-btn-wallet').textContent = this.brokjes;
        this.hud.score.textContent = this.brokjes;
        const player = this.accounts.current;
        document.getElementById('hud-player-name').textContent = `${player.avatar} ${player.name}`;
    }

    // Rebuilds the cat after choosing another cat or changing clothes in the shop
    applyCatAppearance() {
        const look = this.shop.getAppearance();
        this.vincenzo.setAppearance(look);
        document.getElementById('hud-cat-name').textContent = look.name;
        document.querySelector('.cat-avatar').style.background =
            `linear-gradient(135deg, ${colorToCss(look.fur)} 65%, ${colorToCss(look.spots)} 100%)`;
    }

    cycleCamera() {
        this.cameraMode = (this.cameraMode + 1) % 3;
        const names = ["3rd Person Follow", "Room Top-Down", "Cat First-Person"];
        this.showToast(names[this.cameraMode]);
    }

    toggleSound() {
        const isMuted = sound.toggleMute();
        const btn = document.getElementById('btn-sound');
        btn.textContent = isMuted ? '🔇' : '🔊';
    }

    togglePause() {
        if (!this.isRunning) return;
        this.isPaused = !this.isPaused;
        this.screens.pause.style.display = this.isPaused ? 'flex' : 'none';
        document.getElementById('stop-endless-btn').style.display = this.isEndless ? 'inline-block' : 'none';
    }

    async startLevel(lvl) {
        this.mode = 'levels';
        this.currentLevel = lvl;
        const cfg = this.levelConfig();
        if (!cfg) return;
        this.passage = null;
        this.shop.nextLevel = lvl; // the start screen offers this level again next time

        // Build Room Environment for this level (async — loads external env JSON)
        await this.room.buildLevel(lvl, cfg);

        this.timeLeft = cfg.duration || cfg.time || 180;
        this.resetHunt();
        this.placeCat(0, 2, 0);
        this.respawnMice();
        this.beginHunt();

        this.hud.levelName.textContent = `Level ${lvl}: ${cfg.name}`;
        this.hud.radarRoomTitle.textContent = cfg.name;
        this.updateHUD();
        this.showToast(this.room.zeroGravity
            ? `LEVEL ${lvl}: ZERO GRAVITY! Q = UP, Z = DOWN 🚀`
            : `LEVEL ${lvl}: ${cfg.name.toUpperCase()}! 🐾`);
    }

    // Endless mode: no clock, no target, roam the house room by room
    async startEndless() {
        if (!this.endlessConfig) return;
        this.syncEndlessRooms();
        this.mode = 'endless';
        this.resetHunt();
        this.roomsVisited = 0;
        this.foundSecrets.clear();
        await this.enterRoom(this.endlessConfig.startRoom, null);
        this.beginHunt();
    }

    /**
     * Every level's environment is also a room in endless mode. Rooms missing
     * from endless.json (a newly added level) are added here, with a door to
     * and from the room of the level before.
     */
    syncEndlessRooms() {
        if (this.endlessSynced) return;
        this.endlessSynced = true;
        const rooms = this.endlessConfig.rooms;
        let previous = this.endlessConfig.startRoom;
        this.sortedLevels().forEach(lvl => {
            const cfg = this.levelConfigs[lvl];
            if (!cfg.environment) return;
            let id = Object.keys(rooms).find(key => rooms[key].environment === cfg.environment);
            if (!id) {
                id = cfg.environment.replace(/^.*\//, '').replace(/\.json$/, '');
                while (rooms[id]) id += '_';
                rooms[id] = { name: cfg.name.replace(/^The /, ''), icon: cfg.icon || '🚪', environment: cfg.environment, place: 'house', floor: 0, doors: [] };
                rooms[previous].doors.push({ ...freeDoorSpot(rooms[previous].doors), to: id });
                rooms[id].doors.push({ ...freeDoorSpot(rooms[id].doors), to: previous });
            }
            previous = id;
        });
    }

    roomInfo(roomId) {
        const room = this.endlessConfig.rooms[roomId];
        return { id: roomId, label: room ? `${room.icon} ${room.name}` : roomId, place: room && room.place, floor: room && room.floor };
    }

    // The passage behind a door: the door's own "passage", or one that fits the two rooms
    passageOf(fromRoomId, door) {
        const rooms = this.endlessConfig.rooms;
        return door.passage || passageType(rooms[fromRoomId], rooms[door.to]);
    }

    passageName(type, fromRoomId, toRoomId) {
        if (type !== 'stairs') return PASSAGE_NAMES[type];
        const rooms = this.endlessConfig.rooms;
        return (rooms[toRoomId].floor || 0) > (rooms[fromRoomId].floor || 0) ? '🪜 Stairs Up' : '🪜 Stairs Down';
    }

    // Fades the screen to black (or to a bright flash for the teleporter) and back
    fade(out, flash = false) {
        if (out) this.fadeEl.classList.toggle('flash', flash);
        this.fadeEl.style.opacity = out ? '1' : '0';
        return new Promise(resolve => setTimeout(resolve, out ? FADE_TIME : 0));
    }

    // Hidden doors count as found in both directions; returns true the first time
    discoverSecret(roomA, roomB) {
        const key = `${roomA}>${roomB}`;
        if (this.foundSecrets.has(key)) return false;
        this.foundSecrets.add(key);
        this.foundSecrets.add(`${roomB}>${roomA}`);
        return true;
    }

    /**
     * Endless mode: loads another room of the house. The cat comes in through
     * the door that leads back to the room it came from.
     */
    async enterRoom(roomId, fromRoomId) {
        const roomCfg = this.endlessConfig.rooms[roomId];
        if (!roomCfg) return;
        this.roomChanging = true;
        this.abilities.clearProjectiles();
        if (fromRoomId) await this.fade(true);
        this.passage = null;
        this.endlessRoomId = roomId;

        await this.room.buildLevel(0, { environment: roomCfg.environment });
        this.room.addDoors(roomCfg.doors.map(d => ({
            ...d,
            label: this.roomInfo(d.to).label,
            style: d.hidden ? 'flap' : (this.passageOf(roomId, d) === 'teleport' ? 'portal' : undefined)
        })));

        const entryDoor = this.room.doors.find(d => d.to === fromRoomId);
        if (entryDoor) {
            const entry = this.room.doorEntry(entryDoor);
            this.placeCat(entry.x, entry.z, entry.rotY);
        } else {
            this.placeCat(0, 2, 0);
        }
        this.vincenzo.speed = 0;
        this.snapCamera = true;
        this.roomChanging = false;
        this.respawnMice();
        this.roomsVisited++;
        this.doorCooldown = 1.0;

        this.hud.levelName.textContent = `♾️ Endless: ${roomCfg.name}`;
        this.hud.radarRoomTitle.textContent = roomCfg.name;
        this.updateHUD();
        if (fromRoomId) sound.playDoor();
        this.showToast(`${roomCfg.icon} ${roomCfg.name.toUpperCase()}`);
        this.fade(false);
    }

    /**
     * Endless mode: walking through a door leads into a passage (hallway, stairs,
     * garden path, road or teleporter). Its west door goes back, its east door
     * leads on to the next room.
     */
    async enterPassage(fromRoomId, door) {
        const toRoomId = door.to;
        if (!this.endlessConfig.rooms[toRoomId]) return;
        this.roomChanging = true;
        this.abilities.clearProjectiles();
        const type = this.passageOf(fromRoomId, door);
        const secret = door.hidden && this.discoverSecret(fromRoomId, toRoomId);
        await this.fade(true, type === 'teleport');

        this.mice.forEach(m => m.destroy());
        this.mice = [];
        this.passage = { from: fromRoomId, to: toRoomId };
        buildPassage(this.room, type, this.roomInfo(fromRoomId), this.roomInfo(toRoomId));
        const entry = this.room.doorEntry(this.room.doors[0]);
        this.placeCat(entry.x, entry.z, entry.rotY);
        this.snapCamera = true;
        this.doorCooldown = 0.5;
        this.roomChanging = false;

        const name = this.passageName(type, fromRoomId, toRoomId);
        this.hud.levelName.textContent = `♾️ Endless: ${name}`;
        this.hud.radarRoomTitle.textContent = name;
        this.updateHUD();
        if (type === 'teleport') sound.playTeleport();
        else sound.playDoor();
        if (secret) {
            sound.playGoldenAppear();
            this.showToast('🔍 SECRET PASSAGE FOUND!');
        } else {
            this.showToast(`${name.toUpperCase()} ➡ ${this.roomInfo(toRoomId).label.toUpperCase()}`);
        }
        this.fade(false);
    }

    // The player chose to stop the endless hunt: show what they caught
    endEndless() {
        this.isRunning = false;
        this.isPaused = false;
        this.abilities.reset();
        this.screens.pause.style.display = 'none';
        sound.playCatchSuccess();

        document.getElementById('game-over-icon').textContent = '🏠 ♾️';
        document.getElementById('game-over-title').textContent = 'Great Hunt!';
        const secrets = this.foundSecrets.size / 2;
        const secretsText = secrets > 0 ? `, found ${secrets} secret ${secrets === 1 ? 'passage' : 'passages'}` : '';
        document.getElementById('game-over-msg').textContent =
            `You explored ${this.roomsVisited} ${this.roomsVisited === 1 ? 'room' : 'rooms'}${secretsText} and earned ${this.huntBrokjes} brokjes.`;
        document.getElementById('final-caught').textContent = `${this.miceCaught}`;
        document.getElementById('final-score').textContent = this.brokjes;
        document.getElementById('retry-level-btn-text').textContent = 'Hunt Again';
        this.screens.gameOver.style.display = 'flex';
    }

    // Counters and boosts back to zero at the start of a hunt
    resetHunt() {
        this.miceCaught = 0;
        this.huntBrokjes = 0;
        this.combo = 0;
        this.comboTimer = 0;
        this.abilities.reset();
        this.vincenzo.stamina = 100;
    }

    placeCat(x, z, rotY) {
        // Never start inside furniture (the cat would be stuck)
        const spot = this.room.findFreeSpot(x, z, 0.6);
        this.vincenzo.position.set(spot.x, 0, spot.z);
        this.vincenzo.rotationY = rotY;
        this.vincenzo.speed = 0;
    }

    // Clears the old mice and fills the room with fresh ones
    respawnMice() {
        this.mice.forEach(m => m.destroy());
        this.mice = [];
        const cfg = this.levelConfig();
        for (let i = 0; i < cfg.miceCount; i++) {
            this.spawnMouse();
        }
    }

    beginHunt() {
        this.isRunning = true;
        this.isPaused = false;
        this.fadeEl.style.opacity = '0';

        this.screens.start.style.display = 'none';
        this.screens.levelComplete.style.display = 'none';
        this.screens.gameOver.style.display = 'none';
        this.screens.pause.style.display = 'none';

        sound.playMeow();
    }

    spawnMouse() {
        if (this.roomChanging || this.passage) return; // no mice in the passages between rooms
        const cfg = this.levelConfig();
        if (this.mice.length >= cfg.miceCount + this.abilities.extraMice()) return;

        // Now and then a golden mouse appears (never more than one at a time, unless the Lucky Clover is on)
        const lucky = this.abilities.luckyChance();
        const goldenChance = Math.max(lucky, cfg.goldenMouseChance !== undefined ? cfg.goldenMouseChance : DEFAULT_GOLDEN_CHANCE);
        const maxGolden = lucky > 0 ? LUCKY_MAX_GOLDEN : 1;
        const golden = this.mice.filter(m => m.bornGolden).length < maxGolden && Math.random() < goldenChance;

        const mouse = new Mouse(this.scene, this.room, cfg.speedMult, golden);
        this.mice.push(mouse);
        sound.playMouseSqueak();
        // While the Golden Mice boost is on, every new mouse arrives golden too (without the fanfare)
        if (this.abilities.goldenMiceActive()) {
            mouse.setGolden(true);
        } else if (golden) {
            sound.playGoldenAppear();
            this.showToast('✨ A GOLDEN MOUSE APPEARED! ✨');
        }
    }

    // Dedicated Catch Action (SPACEBAR / touch click)
    attemptCatch() {
        if (!this.isRunning || this.isPaused) return;

        this.vincenzo.triggerPounce();

        const catPos = this.vincenzo.position;
        const catchRadius = this.catchRadius();
        let targetIndex = -1;
        let closestDist = 999;

        for (let i = 0; i < this.mice.length; i++) {
            const mouse = this.mice[i];
            if (mouse.state === 'CAUGHT') continue;
            const d = mouse.position.distanceTo(catPos);
            if (d <= catchRadius && d < closestDist) {
                closestDist = d;
                targetIndex = i;
            }
        }

        if (targetIndex !== -1) {
            this.catchMouse(this.mice[targetIndex]);
        } else {
            sound.playPounce();
        }
    }

    /**
     * Removes a mouse as caught (pounce, sneeze, or blaster) and awards brokjes.
     * @param {Mouse} mouse
     * @param {object} [opts] - { silent: true } skips the per-mouse sound and toast
     * @returns {number} brokjes earned
     */
    catchMouse(mouse, opts = {}) {
        const index = this.mice.indexOf(mouse);
        if (index === -1 || !this.isRunning) return 0;

        mouse.state = 'CAUGHT';
        this.miceCaught++;

        const cfg = this.levelConfig();
        const boostMult = this.abilities.brokjesMultiplier();
        const baseBrokjes = mouse.golden
            ? (cfg.goldenMouseBrokjes !== undefined ? cfg.goldenMouseBrokjes : DEFAULT_GOLDEN_REWARD)
            : (cfg.brokjesPerMouse !== undefined ? cfg.brokjesPerMouse : 10);
        const brokjesEarned = baseBrokjes * boostMult;
        this.brokjes += brokjesEarned;
        this.huntBrokjes += brokjesEarned;

        this.combo++;
        this.comboTimer = 3.5;
        const multiplier = Math.min(this.combo, 4);

        this.particles.spawnCatchBurst(mouse.position);
        if (mouse.golden) {
            this.particles.spawnCatchBurst(mouse.position, [0xffd32a, 0xf1c40f, 0xffffff]);
            sound.playGoldenAppear();
        }
        if (!opts.silent) {
            sound.playCatchSuccess();
            sound.playMeow();
            this.showCatchFeedback(brokjesEarned, multiplier, boostMult, mouse.golden);
        }

        mouse.destroy();
        this.mice.splice(index, 1);

        this.updateHUD();

        if (this.isEndless) {
            // Endless mode: a bonus every few mice instead of a target
            if (cfg.milestoneEvery && this.miceCaught % cfg.milestoneEvery === 0) {
                this.brokjes += cfg.milestoneBrokjes;
                this.huntBrokjes += cfg.milestoneBrokjes;
                sound.playGoldenAppear();
                this.showToast(`🏅 ${this.miceCaught} MICE! +${cfg.milestoneBrokjes} BONUS BROKJES!`);
            }
        } else if (this.miceCaught >= cfg.target) {
            this.completeLevel();
            return brokjesEarned;
        }

        // Spawn replacement mouse
        setTimeout(() => {
            if (this.isRunning) this.spawnMouse();
        }, 800);

        return brokjesEarned;
    }

    showCatchFeedback(brokjes, multiplier, boostMult = 1, golden = false) {
        const phrases = ["SQUEAKLESS! 🐾", "PURRFECT CATCH! 🌟", "MEOW MAGNIFICO! 😼", "APEX PREDATOR! 💥"];
        const phrase = golden ? 'GOLDEN MOUSE! 🏆' : phrases[Math.floor(Math.random() * phrases.length)];
        const boostStr = boostMult > 1 ? ` (x${boostMult})` : '';
        this.showToast(`+${brokjes} BROKJES${boostStr}! ${phrase}`);

        if (multiplier > 1) {
            this.hud.comboPopup.textContent = `COMBO x${multiplier}! 🔥`;
            this.hud.comboPopup.style.transform = 'translateX(-50%) scale(1.15)';
        }
    }

    showToast(text) {
        this.hud.toastBanner.textContent = text;
        this.hud.toastBanner.style.opacity = '1';
        this.hud.toastBanner.style.transform = 'translate(-50%, -60%) scale(1.1)';
        setTimeout(() => {
            this.hud.toastBanner.style.opacity = '0';
            this.hud.toastBanner.style.transform = 'translate(-50%, -50%) scale(1)';
        }, 1200);
    }

    completeLevel() {
        this.isRunning = false;
        this.abilities.reset();
        sound.playCatchSuccess();

        const cfg = this.levelConfig();
        const sortedKeys = this.sortedLevels();
        const maxLevel = sortedKeys[sortedKeys.length - 1];

        // Save progress: next time the player continues from the next level (or Level 1 after the last one)
        this.shop.markLevelCompleted(this.currentLevel);
        this.shop.nextLevel = this.currentLevel < maxLevel ? this.currentLevel + 1 : sortedKeys[0];

        // Award completion bonus brokjes defined in levels.json
        const bonusBrokjes = cfg.completionBrokjes !== undefined ? cfg.completionBrokjes : (cfg.bonusBrokjes !== undefined ? cfg.bonusBrokjes : 50);
        this.brokjes += bonusBrokjes;

        const icon = document.getElementById('level-complete-icon');
        const title = document.getElementById('level-complete-title');
        const msg = document.getElementById('level-complete-msg');
        const nextBtnText = document.getElementById('next-level-btn-text');

        document.getElementById('lvl-clear-caught').textContent = `${this.miceCaught} / ${cfg.target}`;
        const bonusEl = document.getElementById('lvl-clear-bonus');
        if (bonusEl) {
            bonusEl.textContent = `+${bonusBrokjes} Brokjes`;
        }
        document.getElementById('lvl-clear-score').textContent = this.brokjes;
        this.updateHUD();

        if (cfg.clearIcon) icon.textContent = cfg.clearIcon;
        if (cfg.clearTitle) title.textContent = cfg.clearTitle;
        if (cfg.clearMsg) msg.textContent = cfg.clearMsg;
        if (nextBtnText) {
            if (cfg.nextBtnText) {
                nextBtnText.textContent = cfg.nextBtnText;
            } else {
                nextBtnText.textContent = this.currentLevel < maxLevel ? `Proceed to Level ${this.currentLevel + 1}` : 'Play Again from Level 1';
            }
        }

        this.screens.levelComplete.style.display = 'flex';
    }

    timeUp() {
        this.isRunning = false;
        this.abilities.reset();
        sound.playMeow();

        const cfg = this.levelConfig();
        document.getElementById('game-over-icon').textContent = '⏱️';
        document.getElementById('game-over-title').textContent = "Time's Up!";
        document.getElementById('retry-level-btn-text').textContent = 'Retry Level';
        document.getElementById('game-over-msg').textContent = `You caught ${this.miceCaught} out of ${cfg.target} mice in ${cfg.name}.`;
        document.getElementById('final-caught').textContent = `${this.miceCaught} / ${cfg.target}`;
        document.getElementById('final-score').textContent = this.brokjes;

        this.screens.gameOver.style.display = 'flex';
    }

    updateHUD() {
        const cfg = this.levelConfig();
        if (!cfg) return;
        this.updateWalletDisplay();
        this.hud.caught.textContent = this.isEndless ? `${this.miceCaught}` : `${this.miceCaught} / ${cfg.target}`;
        this.hud.mice.textContent = this.mice.length;
        this.hud.timer.textContent = this.isEndless ? '∞' : this.formatTime(this.timeLeft);
        // Float controls are only shown in zero gravity
        document.body.classList.toggle('zero-gravity', this.room.zeroGravity);
        this.hud.staminaBar.style.width = `${(this.vincenzo.stamina / this.vincenzo.maxStamina) * 100}%`;
    }

    drawRadar() {
        const ctx = this.radarCtx;
        const w = this.radarCanvas.width;
        const h = this.radarCanvas.height;

        ctx.clearRect(0, 0, w, h);

        const scaleX = w / 34;
        const scaleZ = h / 26;
        const mapX = (x) => (x + 17) * scaleX;
        const mapZ = (z) => (z + 13) * scaleZ;

        ctx.fillStyle = 'rgba(25, 35, 50, 0.9)';
        ctx.fillRect(0, 0, w, h);

        // Endless-mode doors (orange marks on the walls; secret ones only once found)
        ctx.fillStyle = '#ffa502';
        this.room.doors.forEach(door => {
            if (door.hidden && !this.foundSecrets.has(`${this.endlessRoomId}>${door.to}`)) return;
            const p = this.room.wallPoint(door.wall, door.at, 0);
            const alongX = door.wall === 'north' || door.wall === 'south';
            ctx.fillRect(mapX(p.x) - (alongX ? 6 : 2), mapZ(p.z) - (alongX ? 2 : 6), alongX ? 12 : 4, alongX ? 4 : 12);
        });

        // Mice (Red dots, golden mouse as a bigger gold dot)
        this.mice.forEach(m => {
            ctx.fillStyle = m.golden ? '#ffd32a' : '#ff4757';
            ctx.beginPath();
            ctx.arc(mapX(m.position.x), mapZ(m.position.z), m.golden ? 5 : 3.5, 0, Math.PI * 2);
            ctx.fill();
        });

        // Vincenzo (White Cat triangle with two red spots near tail)
        ctx.save();
        ctx.translate(mapX(this.vincenzo.position.x), mapZ(this.vincenzo.position.z));
        ctx.rotate(this.vincenzo.rotationY);

        ctx.fillStyle = colorToCss(this.vincenzo.appearance.fur);
        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.lineTo(-4, 4);
        ctx.lineTo(4, 4);
        ctx.closePath();
        ctx.fill();

        // Two red spots at the back
        ctx.fillStyle = colorToCss(this.vincenzo.appearance.spots);
        ctx.beginPath();
        ctx.arc(-2, 2.5, 1.2, 0, Math.PI * 2);
        ctx.arc(2, 2.5, 1.2, 0, Math.PI * 2);
        ctx.fill();

        // Vision cone
        ctx.fillStyle = 'rgba(255, 159, 67, 0.2)';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, 16, -Math.PI * 0.75, -Math.PI * 0.25);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }

    updateCamera(dt) {
        const catPos = this.vincenzo.position;
        const snap = this.snapCamera;
        this.snapCamera = false;
        const catRot = this.vincenzo.rotationY;

        // In first-person the cat's own head would block the view
        this.vincenzo.mesh.visible = this.cameraMode !== 2;

        if (this.cameraMode === 0) {
            // 3rd Person Follow
            const idealOffset = new THREE.Vector3(
                Math.sin(catRot) * 4.6,
                2.8,
                Math.cos(catRot) * 4.6
            );
            const targetCamPos = new THREE.Vector3().addVectors(catPos, idealOffset);

            // Jump straight behind the cat after walking into another room
            this.camera.position.lerp(targetCamPos, snap ? 1 : 0.1);
            const lookAtTarget = catPos.clone().add(new THREE.Vector3(0, 0.8, 0));
            this.camera.lookAt(lookAtTarget);

        } else if (this.cameraMode === 1) {
            // Top-Down Overview
            const topDownPos = new THREE.Vector3(0, 24, 0.5);
            this.camera.position.lerp(topDownPos, 0.1);
            this.camera.lookAt(0, 0, 0);

        } else if (this.cameraMode === 2) {
            // First-Person Cat Eye
            const eyePos = catPos.clone().add(new THREE.Vector3(
                -Math.sin(catRot) * 0.4,
                0.7,
                -Math.cos(catRot) * 0.4
            ));
            this.camera.position.copy(eyePos);
            const lookAhead = eyePos.clone().add(new THREE.Vector3(
                -Math.sin(catRot) * 5,
                0,
                -Math.cos(catRot) * 5
            ));
            this.camera.lookAt(lookAhead);
        }
    }

    loop(time) {
        requestAnimationFrame((t) => this.loop(t));

        const dt = Math.min((time - this.lastTime) / 1000, 0.08);
        this.lastTime = time;

        if (this.isRunning && !this.isPaused && !this.roomChanging) {
            if (!this.isEndless) {
                this.timeLeft -= dt;
                if (this.timeLeft <= 0) {
                    this.timeLeft = 0;
                    this.timeUp();
                }
            }

            if (this.comboTimer > 0) {
                this.comboTimer -= dt;
                if (this.comboTimer <= 0) {
                    this.combo = 0;
                    this.hud.comboPopup.style.transform = 'translateX(-50%) scale(0)';
                }
            }

            // Boost timers & blaster pellets (may finish the level)
            this.abilities.update(dt);

            // Update Vincenzo
            this.vincenzo.update(dt, this.input, this.room);

            // Endless mode: a door leads into a passage, and the passage's doors into the rooms
            if (this.isEndless && this.isRunning) {
                this.doorCooldown = Math.max(0, this.doorCooldown - dt);
                const door = this.doorCooldown <= 0 && this.room.doorAt(this.vincenzo.position.x, this.vincenzo.position.z);
                if (door && this.passage) {
                    // Back to where the cat came from, or on to the next room
                    const { from, to } = this.passage;
                    this.enterRoom(door.to, door.to === to ? from : to);
                } else if (door) {
                    this.enterPassage(this.endlessRoomId, door);
                }
            }

            // Dust particles
            if (Math.abs(this.vincenzo.speed) > 4 && Math.random() < 0.35) {
                this.particles.spawnDust(this.vincenzo.position);
            }

            // Update Mice
            let anyMouseInRange = false;
            const catchRadius = this.catchRadius();
            const mouseDt = dt * this.abilities.miceSpeedFactor(); // Sleepy Mice boost
            const mouseOpts = { calm: this.abilities.miceCalm(), catchRadius };
            for (let i = 0; i < this.mice.length; i++) {
                const mouse = this.mice[i];
                mouse.update(mouseDt, this.vincenzo.position, mouseOpts);
                if (mouse.position.distanceTo(this.vincenzo.position) <= catchRadius) {
                    anyMouseInRange = true;
                }
            }

            // Toggle HUD on-screen prompt
            if (anyMouseInRange) {
                this.hud.catchHint.classList.add('active');
            } else {
                this.hud.catchHint.classList.remove('active');
            }

            this.updateHUD();
        }

        // Animated decorations (TV aquarium, clouds, waves, reactor...)
        this.room.update(dt);

        this.particles.update(dt);
        this.updateCamera(dt);
        this.drawRadar();

        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize Game on Window Load
window.addEventListener('DOMContentLoaded', () => {
    new VincenzoGame();
});
