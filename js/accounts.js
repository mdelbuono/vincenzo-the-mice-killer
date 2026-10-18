// --- Player Accounts: separate saved progress per player in localStorage ---
const STORE_KEY = 'vincenzo-accounts-v1';
const LEGACY_SAVE_KEY = 'vincenzo-save-v1'; // single-player save from before accounts existed
const AVATARS = ['🐱', '🦊', '🐼', '🐸', '🦄', '🐯', '🐵', '🐧', '🐨', '🐙'];
export const MAX_NAME_LENGTH = 16;

export class AccountStore {
    constructor() {
        this.state = this.load();
    }

    load() {
        let state = null;
        try {
            const raw = localStorage.getItem(STORE_KEY);
            if (raw) state = JSON.parse(raw);
        } catch (err) {
            console.warn('Could not read player accounts:', err);
        }
        if (!state || !state.accounts) state = { current: null, accounts: {} };

        // First run: create "Player 1", carrying over any old single-player save
        if (Object.keys(state.accounts).length === 0) {
            let legacy = null;
            try {
                legacy = JSON.parse(localStorage.getItem(LEGACY_SAVE_KEY));
            } catch (err) {
                legacy = null;
            }
            const account = this.makeAccount('Player 1', 0, legacy || {});
            state.accounts[account.id] = account;
            state.current = account.id;
        }

        if (!state.accounts[state.current]) state.current = Object.keys(state.accounts)[0];
        this.state = state;
        this.persist();
        return state;
    }

    persist() {
        try {
            localStorage.setItem(STORE_KEY, JSON.stringify(this.state));
        } catch (err) {
            console.warn('Could not save player accounts:', err);
        }
    }

    makeAccount(name, index, data) {
        return {
            id: `p${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`,
            name: name,
            avatar: AVATARS[index % AVATARS.length],
            created: Date.now(),
            data: data
        };
    }

    // Accounts in the order they were created
    list() {
        return Object.values(this.state.accounts).sort((a, b) => a.created - b.created);
    }

    get current() { return this.state.accounts[this.state.current]; }

    currentData() { return this.current.data; }

    saveCurrentData(data) {
        this.current.data = data;
        this.persist();
    }

    /**
     * Validates a new player name.
     * @returns {string|null} an error message, or null if the name is fine
     */
    validateName(name) {
        const clean = name.trim();
        if (!clean) return 'Type a name first!';
        if (clean.length > MAX_NAME_LENGTH) return `Names can be at most ${MAX_NAME_LENGTH} letters.`;
        if (this.list().some(a => a.name.toLowerCase() === clean.toLowerCase())) return `"${clean}" already exists.`;
        return null;
    }

    // Creates a player with a fresh save and switches to it
    create(name) {
        const account = this.makeAccount(name.trim(), this.list().length, {});
        this.state.accounts[account.id] = account;
        this.state.current = account.id;
        this.persist();
        return account;
    }

    switchTo(id) {
        if (!this.state.accounts[id]) return;
        this.state.current = id;
        this.persist();
    }

    // The last remaining player can't be removed
    remove(id) {
        if (!this.state.accounts[id] || this.list().length <= 1) return;
        delete this.state.accounts[id];
        if (this.state.current === id) this.state.current = this.list()[0].id;
        this.persist();
    }
}

// "Who's playing?" picker on the start screen
export class AccountPicker {
    /**
     * @param {AccountStore} store
     * @param {function} onSwitch - called after the current player changed
     */
    constructor(store, onSwitch) {
        this.store = store;
        this.onSwitch = onSwitch;
        this.listEl = document.getElementById('account-list');
        this.form = document.getElementById('account-add-form');
        this.input = document.getElementById('account-name-input');
        this.errorEl = document.getElementById('account-error');
        this.input.maxLength = MAX_NAME_LENGTH;

        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            const error = this.store.validateName(this.input.value);
            if (error) {
                this.errorEl.textContent = error;
                return;
            }
            this.store.create(this.input.value);
            this.input.value = '';
            this.errorEl.textContent = '';
            this.onSwitch();
        });
    }

    render(walletOf) {
        this.listEl.innerHTML = '';
        const accounts = this.store.list();
        accounts.forEach(account => {
            const isCurrent = account.id === this.store.current.id;
            const pill = document.createElement('button');
            pill.type = 'button';
            pill.className = `lvl-pill account-pill ${isCurrent ? 'active' : ''}`;
            pill.textContent = `${account.avatar} ${account.name} · 🥫 ${walletOf(account)}`;
            pill.addEventListener('click', () => {
                if (isCurrent) return;
                this.store.switchTo(account.id);
                this.onSwitch();
            });
            this.listEl.appendChild(pill);

            if (isCurrent && accounts.length > 1) {
                const del = document.createElement('button');
                del.type = 'button';
                del.className = 'account-delete';
                del.title = `Delete ${account.name}`;
                del.textContent = '🗑️';
                del.addEventListener('click', () => {
                    if (!window.confirm(`Delete ${account.name} and all their brokjes and purchases?`)) return;
                    this.store.remove(account.id);
                    this.onSwitch();
                });
                this.listEl.appendChild(del);
            }
        });
    }
}
