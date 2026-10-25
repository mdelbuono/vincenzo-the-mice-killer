import { sound } from './sound.js';
import { DEFAULT_CAT_APPEARANCE } from './cat.js';

// --- Brokjes Shop: the current player's wallet, owned items, inventory, and the shop screen ---
const PERMANENT_TYPES = ['cat', 'outfit', 'unlock'];

// Item ids that were renamed (old saves still contain the old ids)
const RENAMED_ITEMS = {
    boost_kibbles2: 'boost_brokjes2',
    boost_kibbles3: 'boost_brokjes3'
};

// 0xffaa00 -> "#ffaa00"
export function colorToCss(color) {
    const n = typeof color === 'string' ? parseInt(color, 16) : color;
    return '#' + n.toString(16).padStart(6, '0');
}

// 1000000 -> "1,000,000"
export function formatBrokjes(n) {
    return n.toLocaleString('en-US');
}

export class Shop {
    /**
     * @param {object} callbacks - { onWalletChange, onAppearanceChange, onInventoryChange, onOpen, onClose }
     */
    constructor(callbacks, accounts) {
        this.callbacks = callbacks;
        this.accounts = accounts;
        this.catalog = { categories: [], items: [] };
        this.itemsById = {};
        this.loaded = false;
        this.loadError = false;
        this.isOpen = false;
        this.activeCategory = 'cats';
        this.data = Shop.normalizeSave(accounts.currentData());

        this.screen = document.getElementById('shop-screen');
        this.tabsEl = document.getElementById('shop-tabs');
        this.gridEl = document.getElementById('shop-grid');
        this.walletEl = document.getElementById('shop-wallet');
        this.revealEl = document.getElementById('shop-reveal');

        document.getElementById('shop-close-btn').addEventListener('click', () => this.close());
        document.getElementById('shop-reveal-ok').addEventListener('click', () => {
            this.revealEl.style.display = 'none';
        });
        this.gridEl.addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-action]');
            if (!btn || btn.disabled) return;
            this.handleAction(btn.dataset.action, btn.dataset.id);
        });
    }

    // ---------- Save data ----------

    static defaultSave() {
        return {
            brokjes: 0,
            owned: ['cat_vincenzo'],
            inventory: {},
            selectedCat: 'cat_vincenzo',
            equipped: { hat: null, face: null, neck: null, back: null },
            nextLevel: 1,       // campaign level the start screen offers first
            completedLevels: [] // levels cleared at least once
        };
    }

    // Fills in missing fields and upgrades saves made by older versions of the game
    static normalizeSave(saved = {}) {
        const base = Shop.defaultSave();
        const rename = id => RENAMED_ITEMS[id] || id;
        const inventory = {};
        Object.entries(saved.inventory || {}).forEach(([id, n]) => {
            inventory[rename(id)] = (inventory[rename(id)] || 0) + n;
        });
        const data = {
            ...base,
            ...saved,
            owned: Array.from(new Set([...base.owned, ...(saved.owned || []).map(rename)])),
            inventory: inventory,
            equipped: { ...base.equipped, ...(saved.equipped || {}) }
        };
        // Points used to be called "kibbles"
        if (saved.kibbles !== undefined && saved.brokjes === undefined) data.brokjes = saved.kibbles;
        // Levels used to be played strictly in order: every level before nextLevel was cleared
        if (!Array.isArray(saved.completedLevels)) {
            data.completedLevels = [];
            for (let lvl = 1; lvl < data.nextLevel; lvl++) data.completedLevels.push(lvl);
        }
        delete data.kibbles;
        delete data.secretFound; // left over from the removed password easter egg
        return data;
    }

    persist() {
        this.accounts.saveCurrentData(this.data);
    }

    // Loads the current player's save (after switching, adding or removing players)
    reloadAccount() {
        this.data = Shop.normalizeSave(this.accounts.currentData());
        this.persist();
        this.walletEl.textContent = this.data.brokjes;
        if (this.callbacks.onWalletChange) this.callbacks.onWalletChange(this.data.brokjes);
        this.notifyAppearance();
        this.notifyInventory();
    }

    get wallet() { return this.data.brokjes; }
    set wallet(val) {
        this.data.brokjes = Math.max(0, Math.round(val));
        this.persist();
        if (this.walletEl) this.walletEl.textContent = this.data.brokjes;
        if (this.callbacks.onWalletChange) this.callbacks.onWalletChange(this.data.brokjes);
    }

    // Campaign progress: the level the start screen offers first
    get nextLevel() { return this.data.nextLevel; }
    set nextLevel(level) {
        this.data.nextLevel = level;
        this.persist();
    }

    get completedLevels() { return this.data.completedLevels; }
    markLevelCompleted(level) {
        if (this.data.completedLevels.includes(level)) return;
        this.data.completedLevels.push(level);
        this.persist();
    }

    isOwned(id) { return this.data.owned.includes(id); }
    count(id) { return this.data.inventory[id] || 0; }

    addToInventory(id, amount) {
        this.data.inventory[id] = this.count(id) + amount;
    }

    // Uses one of a consumable item. Returns false if none are left.
    consume(id) {
        if (this.count(id) <= 0) return false;
        this.data.inventory[id]--;
        this.persist();
        this.notifyInventory();
        return true;
    }

    ownsWeapon(weapon) {
        return this.catalog.items.some(i => i.type === 'unlock' && i.weapon === weapon && this.isOwned(i.id));
    }

    notifyInventory() {
        if (this.callbacks.onInventoryChange) this.callbacks.onInventoryChange();
    }

    notifyAppearance() {
        if (this.callbacks.onAppearanceChange) this.callbacks.onAppearanceChange();
    }

    // ---------- Catalog ----------

    async loadCatalog() {
        try {
            const response = await fetch('shop.json');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            this.catalog = await response.json();
            this.itemsById = {};
            this.catalog.items.forEach(item => { this.itemsById[item.id] = item; });
            this.loaded = true;
        } catch (err) {
            this.loadError = true;
            console.warn('Could not load shop.json, the shop is closed:', err);
        }
        this.notifyAppearance();
        this.notifyInventory();
        if (this.isOpen) this.render();
    }

    // Builds the Cat appearance object from the selected cat and equipped outfits
    getAppearance() {
        const catItem = this.itemsById[this.data.selectedCat] || this.catalog.items.find(i => i.type === 'cat' && i.default);
        if (!catItem) return DEFAULT_CAT_APPEARANCE;
        const outfits = Object.values(this.data.equipped)
            .map(id => this.itemsById[id])
            .filter(item => item && this.isOwned(item.id))
            .map(item => item.builder);
        return {
            name: catItem.name,
            fur: parseInt(catItem.fur, 16),
            spots: parseInt(catItem.spots, 16),
            eyes: parseInt(catItem.eyes, 16),
            pattern: catItem.pattern || 'spots',
            outfits: outfits,
            blaster: this.ownsWeapon('blaster'),
            squirter: this.ownsWeapon('squirter'),
            catArmy: this.ownsWeapon('catArmy')
        };
    }

    // ---------- Buying ----------

    handleAction(action, id) {
        const item = this.itemsById[id];
        if (!item) return;
        if (action === 'buy') this.buy(item);
        else if (action === 'select') this.selectCat(item);
        else if (action === 'equip') this.toggleOutfit(item);
        this.render();
    }

    buy(item) {
        if (this.wallet < item.price) return;
        if (PERMANENT_TYPES.includes(item.type) && this.isOwned(item.id)) return;

        this.wallet = this.wallet - item.price;
        sound.playPurchase();

        if (item.type === 'mystery') {
            this.openMysteryBox();
        } else {
            this.grant(item);
        }
    }

    // Gives the player an item (from a purchase or a surprise box)
    grant(item) {
        if (PERMANENT_TYPES.includes(item.type)) {
            if (!this.isOwned(item.id)) this.data.owned.push(item.id);
            if (item.includes) {
                Object.entries(item.includes).forEach(([id, amount]) => this.addToInventory(id, amount));
            }
            // New cats and clothes are put on straight away
            if (item.type === 'cat') this.data.selectedCat = item.id;
            if (item.type === 'outfit') this.data.equipped[item.slot] = item.id;
        } else {
            this.addToInventory(item.id, item.quantity || 1);
        }
        this.persist();
        this.notifyAppearance();
        this.notifyInventory();
    }

    // Anything in the shop except surprise boxes, the free starter cat, items marked
    // "noSurprise", permanent items already owned, and ammo for weapons not owned yet.
    mysteryPool() {
        return this.catalog.items.filter(i =>
            i.type !== 'mystery' &&
            !i.default &&
            !i.noSurprise &&
            !(PERMANENT_TYPES.includes(i.type) && this.isOwned(i.id)) &&
            !(i.requires && !this.isOwned(i.requires))
        );
    }

    openMysteryBox() {
        const pool = this.mysteryPool();
        if (pool.length === 0) return;
        const prize = pool[Math.floor(Math.random() * pool.length)];
        this.grant(prize);

        const qty = PERMANENT_TYPES.includes(prize.type) ? '' : ` x${prize.quantity || 1}`;
        document.getElementById('shop-reveal-icon').textContent = prize.icon;
        document.getElementById('shop-reveal-name').textContent = `${prize.name}${qty}`;
        document.getElementById('shop-reveal-desc').textContent = prize.description;
        this.revealEl.style.display = 'flex';
        sound.playCatchSuccess();
    }

    selectCat(item) {
        if (!this.isOwned(item.id)) return;
        this.data.selectedCat = item.id;
        this.persist();
        this.notifyAppearance();
    }

    toggleOutfit(item) {
        if (!this.isOwned(item.id)) return;
        this.data.equipped[item.slot] = this.data.equipped[item.slot] === item.id ? null : item.id;
        this.persist();
        this.notifyAppearance();
    }

    // ---------- Shop screen ----------

    open() {
        this.isOpen = true;
        this.revealEl.style.display = 'none';
        this.render();
        this.screen.style.display = 'flex';
        if (this.callbacks.onOpen) this.callbacks.onOpen();
    }

    close() {
        if (!this.isOpen) return;
        this.isOpen = false;
        this.screen.style.display = 'none';
        if (this.callbacks.onClose) this.callbacks.onClose();
    }

    render() {
        this.walletEl.textContent = this.wallet;
        const player = this.accounts.current;
        document.getElementById('shop-player').textContent = `${player.avatar} ${player.name}`;

        if (!this.loaded) {
            this.tabsEl.innerHTML = '';
            this.gridEl.innerHTML = `<p class="shop-empty">${this.loadError ? 'The shop is closed today (could not load shop.json).' : 'Opening the shop...'}</p>`;
            return;
        }

        this.tabsEl.innerHTML = '';
        this.catalog.categories.forEach(cat => {
            const tab = document.createElement('button');
            tab.className = `lvl-pill ${cat.id === this.activeCategory ? 'active' : ''}`;
            tab.textContent = `${cat.icon} ${cat.name}`;
            tab.addEventListener('click', () => {
                this.activeCategory = cat.id;
                this.render();
            });
            this.tabsEl.appendChild(tab);
        });

        const items = this.catalog.items.filter(i => i.category === this.activeCategory);
        this.gridEl.innerHTML = items.map(item => this.renderCard(item)).join('');
    }

    renderCard(item) {
        const owned = this.isOwned(item.id);
        const canAfford = this.wallet >= item.price;
        const buyBtn = canAfford
            ? `<button class="shop-card-btn" data-action="buy" data-id="${item.id}">Buy 🥫 ${formatBrokjes(item.price)}</button>`
            : `<button class="shop-card-btn" disabled>Need 🥫 ${formatBrokjes(item.price)}</button>`;

        let button = buyBtn;
        let meta = '';
        let stateClass = '';

        if (item.type === 'cat') {
            if (owned) {
                const selected = this.data.selectedCat === item.id;
                stateClass = selected ? 'selected' : 'owned';
                button = selected
                    ? '<button class="shop-card-btn" disabled>Playing ✓</button>'
                    : `<button class="shop-card-btn secondary" data-action="select" data-id="${item.id}">Play as ${item.name}</button>`;
            }
        } else if (item.type === 'outfit') {
            if (owned) {
                const worn = this.data.equipped[item.slot] === item.id;
                stateClass = worn ? 'selected' : 'owned';
                button = `<button class="shop-card-btn secondary" data-action="equip" data-id="${item.id}">${worn ? 'Take off' : 'Wear'}</button>`;
            }
        } else if (item.type === 'unlock') {
            if (owned) {
                stateClass = 'owned';
                button = '<button class="shop-card-btn" disabled>Owned ✓</button>';
            }
            if (item.key) meta = `Key <span class="key-badge">${item.key.toUpperCase()}</span>`;
        } else if (item.type === 'boost' || item.type === 'ammo') {
            meta = `You have: <b>${this.count(item.id)}</b> · Key <span class="key-badge">${item.key.toUpperCase()}</span>`;
            if (item.requires && !this.isOwned(item.requires)) {
                const needed = this.itemsById[item.requires];
                button = `<button class="shop-card-btn" disabled>Needs ${needed ? needed.name : item.requires}</button>`;
            }
        }

        const qty = item.quantity && item.quantity > 1 ? ` <span class="shop-qty">x${item.quantity}</span>` : '';
        const iconStyle = item.type === 'cat'
            ? ` style="background: radial-gradient(circle at 72% 70%, ${colorToCss(item.spots)} 0 16%, transparent 17%), radial-gradient(circle at 56% 80%, ${colorToCss(item.spots)} 0 11%, transparent 12%), ${colorToCss(item.fur)}; border-color: ${colorToCss(item.eyes)};"`
            : '';

        return `
            <div class="shop-card ${stateClass}">
                <div class="shop-card-icon${item.type === 'cat' ? ' cat-swatch' : ''}"${iconStyle}>${item.icon}</div>
                <div class="shop-card-name">${item.name}${qty}</div>
                <div class="shop-card-desc">${item.description}</div>
                ${meta ? `<div class="shop-card-meta">${meta}</div>` : ''}
                ${button}
            </div>`;
    }
}
