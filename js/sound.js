// --- Synthesizer / Web Audio Sound Engine ---
class SoundEngine {
    constructor() {
        this.ctx = null;
        this.muted = false;
        this.musicGain = null;
        this.sfxGain = null;
        this.musicInterval = null;
        this.musicBeat = 0;
    }

    init() {
        if (this.ctx) return;
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioCtx();

        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.setValueAtTime(0.12, this.ctx.currentTime);
        this.musicGain.connect(this.ctx.destination);

        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        this.sfxGain.connect(this.ctx.destination);

        this.startBackgroundMusic();
    }

    toggleMute() {
        this.muted = !this.muted;
        if (this.ctx) {
            if (this.muted) {
                this.musicGain.gain.setValueAtTime(0, this.ctx.currentTime);
                this.sfxGain.gain.setValueAtTime(0, this.ctx.currentTime);
            } else {
                this.musicGain.gain.setValueAtTime(0.12, this.ctx.currentTime);
                this.sfxGain.gain.setValueAtTime(0.3, this.ctx.currentTime);
            }
        }
        return this.muted;
    }

    playMeow() {
        if (!this.ctx || this.muted) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(450, t);
        osc.frequency.exponentialRampToValueAtTime(750, t + 0.15);
        osc.frequency.exponentialRampToValueAtTime(500, t + 0.38);

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1200, t);
        filter.Q.setValueAtTime(3, t);

        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.35, t + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.42);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(t);
        osc.stop(t + 0.45);
    }

    playPounce() {
        if (!this.ctx || this.muted) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(260, t);
        osc.frequency.exponentialRampToValueAtTime(80, t + 0.18);

        gain.gain.setValueAtTime(0.4, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(t);
        osc.stop(t + 0.22);
    }

    playMouseSqueak() {
        if (!this.ctx || this.muted) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        const baseFreq = 2200 + Math.random() * 600;
        osc.frequency.setValueAtTime(baseFreq, t);
        osc.frequency.linearRampToValueAtTime(baseFreq + 700, t + 0.04);
        osc.frequency.linearRampToValueAtTime(baseFreq, t + 0.09);

        gain.gain.setValueAtTime(0.18, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.11);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(t);
        osc.stop(t + 0.12);
    }

    playCatchSuccess() {
        if (!this.ctx || this.muted) return;
        const t = this.ctx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, t + idx * 0.06);

            gain.gain.setValueAtTime(0.25, t + idx * 0.06);
            gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.06 + 0.3);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start(t + idx * 0.06);
            osc.stop(t + idx * 0.06 + 0.32);
        });
    }

    startBackgroundMusic() {
        if (this.musicInterval) return;
        const chords = [
            [261.63, 329.63, 392.00, 493.88],
            [220.00, 261.63, 329.63, 392.00],
            [174.61, 220.00, 261.63, 329.63],
            [196.00, 246.94, 293.66, 349.23]
        ];

        this.musicInterval = setInterval(() => {
            if (!this.ctx || this.muted) return;
            const chord = chords[this.musicBeat % chords.length];
            const t = this.ctx.currentTime;

            chord.forEach((freq, i) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq * 0.5, t);

                gain.gain.setValueAtTime(0.03, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 1.8);

                osc.connect(gain);
                gain.connect(this.musicGain);

                osc.start(t + i * 0.02);
                osc.stop(t + 1.9);
            });

            this.musicBeat++;
        }, 2000);
    }
}

const sound = new SoundEngine();
