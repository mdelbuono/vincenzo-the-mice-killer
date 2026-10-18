import * as THREE from 'three';
import { sound } from './sound.js';
import { ParticleManager } from './particles.js';
import { LevelEnvironment } from './environment.js';
import { Cat } from './cat.js';
import { Mouse } from './mouse.js';
import { Shop, colorToCss } from './shop.js';
import { AbilityManager } from './abilities.js';
import { AccountStore, AccountPicker } from './accounts.js';

// Golden mouse defaults (levels.json can override per level)
const DEFAULT_GOLDEN_CHANCE = 0.12;  // chance that a newly spawned mouse is golden
const DEFAULT_GOLDEN_REWARD = 50;    // brokjes for catching one

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
            1: { id: 1, name: 'Living Room', target: 10, duration: 180, time: 180, miceCount: 3, speedMult: 1.0, brokjesPerMouse: 10, completionBrokjes: 50, goldenMouseChance: 0.12, goldenMouseBrokjes: 50, clearIcon: '🎉 🛋️', clearTitle: 'Level 1 Cleared!', clearMsg: 'Living Room is clear! But mice are scurrying upstairs in the dusty Attic!', nextBtnText: 'Enter Level 2: The Attic (15 Mice)' },
            2: { id: 2, name: 'The Attic', target: 15, duration: 150, time: 150, miceCount: 5, speedMult: 1.2, brokjesPerMouse: 10, completionBrokjes: 100, goldenMouseChance: 0.12, goldenMouseBrokjes: 60, clearIcon: '📦 🌟', clearTitle: 'Level 2 Cleared!', clearMsg: 'The Attic is safe! But a massive infestation is swarming in the dark Basement!', nextBtnText: 'Enter Level 3: The Basement (20 Mice)' },
            3: { id: 3, name: 'The Basement', target: 20, duration: 120, time: 120, miceCount: 6, speedMult: 1.35, brokjesPerMouse: 10, completionBrokjes: 200, goldenMouseChance: 0.15, goldenMouseBrokjes: 80, clearIcon: '🔥 🛢️', clearTitle: 'Level 3 Cleared!', clearMsg: 'The Basement is quiet! But a hungry gang of mice has raided the Kitchen and is going after the cheese!', nextBtnText: 'Enter Level 4: The Kitchen (25 Mice)' },
            4: { id: 4, name: 'The Kitchen', target: 25, duration: 120, time: 120, miceCount: 8, speedMult: 1.5, brokjesPerMouse: 10, completionBrokjes: 300, goldenMouseChance: 0.18, goldenMouseBrokjes: 100, clearIcon: '👑 🏆 🐱', clearTitle: 'GRAND CHAMPION VINCENZO!', clearMsg: 'All 4 levels conquered! 70 total mice caught! Vincenzo is the ultimate legendary mouse killer!', nextBtnText: 'Play Again from Level 1' }
        };

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
            sprint: false
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

    updateStartScreenFromConfig() {
        const selectorRow = document.querySelector('.level-selector-row');
        if (selectorRow) {
            selectorRow.innerHTML = '';
            const sortedKeys = Object.keys(this.levelConfigs).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
            sortedKeys.forEach((lvlKey) => {
                const lvl = parseInt(lvlKey, 10);
                const cfg = this.levelConfigs[lvlKey];
                const btn = document.createElement('button');
                btn.className = `lvl-pill ${lvl === this.currentLevel ? 'active' : ''}`;
                btn.dataset.level = lvl;
                btn.textContent = `Lvl ${lvl}: ${cfg.name} (${cfg.target})`;
                btn.addEventListener('click', () => {
                    document.querySelectorAll('.lvl-pill').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    this.currentLevel = lvl;
                });
                selectorRow.appendChild(btn);
            });
        }

        const missionBox = document.getElementById('start-mission-desc');
        if (missionBox) {
            let html = '<strong>Campaign Rules:</strong><ul>';
            const sortedKeys = Object.keys(this.levelConfigs).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
            sortedKeys.forEach((lvlKey) => {
                const cfg = this.levelConfigs[lvlKey];
                const durText = this.formatDurationText(cfg.duration || cfg.time || 60);
                const extra = cfg.speedMult > 1.25 ? ' (intense swarm!)' : (cfg.speedMult > 1.0 ? ' (faster mice!)' : '');
                const bonus = cfg.completionBrokjes !== undefined ? cfg.completionBrokjes : (cfg.bonusBrokjes || 0);
                const bonusStr = bonus > 0 ? ` (+${bonus} bonus brokjes)` : '';
                html += `<li>Level ${lvlKey} (${cfg.name}): Catch <strong>${cfg.target} mice</strong> in ${durText}${extra}${bonusStr}.</li>`;
            });
            html += '<li>Each mouse caught awards <strong>10 brokjes</strong>. A rare ✨ <strong>golden mouse</strong> is faster but worth much more!</li>';
            html += '<li>Press <strong>SPACEBAR</strong> when near a mouse to pounce and catch it!</li>';
            html += '<li>Spend your brokjes in the <strong>🛒 Shop</strong> (top-left): new cats, boosts, sneezes, a blaster and clothes!</li></ul>';
            missionBox.innerHTML = html;
        }

        const currentCfg = this.levelConfigs[this.currentLevel] || this.levelConfigs[String(this.currentLevel)];
        if (currentCfg) {
            this.timeLeft = currentCfg.duration || currentCfg.time || 180;
            this.updateHUD();
        }
    }

    setupUI() {
        // Level Selector Pills on start screen
        document.querySelectorAll('.lvl-pill').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.lvl-pill').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentLevel = parseInt(btn.dataset.level, 10);
            });
        });

        document.getElementById('start-game-btn').addEventListener('click', () => {
            sound.init();
            this.startLevel(this.currentLevel);
        });

        document.getElementById('next-level-btn').addEventListener('click', () => {
            const sortedKeys = Object.keys(this.levelConfigs).map(k => parseInt(k, 10)).sort((a, b) => a - b);
            const maxLevel = sortedKeys.length > 0 ? sortedKeys[sortedKeys.length - 1] : 3;
            if (this.currentLevel < maxLevel) {
                this.startLevel(this.currentLevel + 1);
            } else {
                // Completed game! Loop back to 1 (brokjes stay in the wallet)
                this.startLevel(1);
            }
        });

        document.getElementById('retry-level-btn').addEventListener('click', () => {
            this.startLevel(this.currentLevel);
        });

        document.getElementById('restart-all-btn').addEventListener('click', () => {
            this.startLevel(1);
        });

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
        this.updateStartScreenFromConfig();
        this.renderAccounts();
    }

    renderAccounts() {
        this.accountPicker.render(account => Shop.normalizeSave(account.data).brokjes);
    }

    onAccountSwitch() {
        this.shop.reloadAccount();
        this.renderAccounts();
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
    }

    async startLevel(lvl) {
        this.currentLevel = lvl;
        const cfg = this.levelConfigs[lvl] || this.levelConfigs[String(lvl)];
        if (!cfg) return;

        // Build Room Environment for this level (async — loads external env JSON)
        await this.room.buildLevel(lvl, cfg);

        this.miceCaught = 0;
        this.timeLeft = cfg.duration || cfg.time || 180;
        this.combo = 0;
        this.comboTimer = 0;
        this.abilities.reset();

        // Reset Vincenzo
        this.vincenzo.position.set(0, 0, 2);
        this.vincenzo.rotationY = 0;
        this.vincenzo.speed = 0;
        this.vincenzo.stamina = 100;

        // Clear old mice
        this.mice.forEach(m => m.destroy());
        this.mice = [];

        // Spawn active mice for this level
        for (let i = 0; i < cfg.miceCount; i++) {
            this.spawnMouse(cfg.speedMult);
        }

        this.isRunning = true;
        this.isPaused = false;

        // Hide overlay screens
        this.screens.start.style.display = 'none';
        this.screens.levelComplete.style.display = 'none';
        this.screens.gameOver.style.display = 'none';
        this.screens.pause.style.display = 'none';

        // Update UI headers
        this.hud.levelName.textContent = `Level ${lvl}: ${cfg.name}`;
        this.hud.radarRoomTitle.textContent = cfg.name;

        this.updateHUD();
        sound.playMeow();
        this.showToast(`LEVEL ${lvl}: ${cfg.name.toUpperCase()}! 🐾`);
    }

    spawnMouse(speedMultiplier = 1.0) {
        const cfg = this.levelConfigs[this.currentLevel] || this.levelConfigs[String(this.currentLevel)];
        if (this.mice.length >= cfg.miceCount) return;

        // Now and then a golden mouse appears (never more than one at a time)
        const goldenChance = cfg.goldenMouseChance !== undefined ? cfg.goldenMouseChance : DEFAULT_GOLDEN_CHANCE;
        const golden = !this.mice.some(m => m.golden) && Math.random() < goldenChance;

        const mouse = new Mouse(this.scene, this.room, speedMultiplier || cfg.speedMult, golden);
        this.mice.push(mouse);
        sound.playMouseSqueak();
        if (golden) {
            sound.playGoldenAppear();
            this.showToast('✨ A GOLDEN MOUSE APPEARED! ✨');
        }
    }

    // Dedicated Catch Action (SPACEBAR / touch click)
    attemptCatch() {
        if (!this.isRunning || this.isPaused) return;

        this.vincenzo.triggerPounce();

        const catPos = this.vincenzo.position;
        const catchRadius = 3.2;
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

        const cfg = this.levelConfigs[this.currentLevel] || this.levelConfigs[String(this.currentLevel)];
        const boostMult = this.abilities.brokjesMultiplier();
        const baseBrokjes = mouse.golden
            ? (cfg.goldenMouseBrokjes !== undefined ? cfg.goldenMouseBrokjes : DEFAULT_GOLDEN_REWARD)
            : (cfg.brokjesPerMouse !== undefined ? cfg.brokjesPerMouse : 10);
        const brokjesEarned = baseBrokjes * boostMult;
        this.brokjes += brokjesEarned;

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

        // Check Win
        if (this.miceCaught >= cfg.target) {
            this.completeLevel();
            return brokjesEarned;
        }

        // Spawn replacement mouse
        setTimeout(() => {
            if (this.isRunning) this.spawnMouse(cfg.speedMult);
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

        const cfg = this.levelConfigs[this.currentLevel] || this.levelConfigs[String(this.currentLevel)];
        const sortedKeys = Object.keys(this.levelConfigs).map(k => parseInt(k, 10)).sort((a, b) => a - b);
        const maxLevel = sortedKeys.length > 0 ? sortedKeys[sortedKeys.length - 1] : 3;

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

        const cfg = this.levelConfigs[this.currentLevel] || this.levelConfigs[String(this.currentLevel)];
        document.getElementById('game-over-title').textContent = "Time's Up!";
        document.getElementById('game-over-msg').textContent = `You caught ${this.miceCaught} out of ${cfg.target} mice in ${cfg.name}.`;
        document.getElementById('final-caught').textContent = `${this.miceCaught} / ${cfg.target}`;
        document.getElementById('final-score').textContent = this.brokjes;

        this.screens.gameOver.style.display = 'flex';
    }

    updateHUD() {
        const cfg = this.levelConfigs[this.currentLevel] || this.levelConfigs[String(this.currentLevel)];
        if (!cfg) return;
        this.updateWalletDisplay();
        this.hud.caught.textContent = `${this.miceCaught} / ${cfg.target}`;
        this.hud.mice.textContent = this.mice.length;
        this.hud.timer.textContent = this.formatTime(this.timeLeft);
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

            this.camera.position.lerp(targetCamPos, 0.1);
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

        if (this.isRunning && !this.isPaused) {
            this.timeLeft -= dt;
            if (this.timeLeft <= 0) {
                this.timeLeft = 0;
                this.timeUp();
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

            // Dust particles
            if (Math.abs(this.vincenzo.speed) > 4 && Math.random() < 0.35) {
                this.particles.spawnDust(this.vincenzo.position);
            }

            // Update Mice
            let anyMouseInRange = false;
            for (let i = 0; i < this.mice.length; i++) {
                const mouse = this.mice[i];
                mouse.update(dt, this.vincenzo.position);
                if (mouse.position.distanceTo(this.vincenzo.position) <= 3.2) {
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

        // Animate TV aquarium if in Level 1
        if (this.room.tvTexture && this.room.tvTexture.updateAnimation) {
            this.room.tvTexture.updateAnimation();
        }

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
