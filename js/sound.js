// --- Synthesizer / Web Audio Sound Engine ---
export class SoundEngine {
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

    playSneeze() {
        if (!this.ctx || this.muted) return;
        const t = this.ctx.currentTime;

        // "Ah..." rising breath
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, t);
        osc.frequency.exponentialRampToValueAtTime(700, t + 0.3);
        oscGain.gain.setValueAtTime(0, t);
        oscGain.gain.linearRampToValueAtTime(0.15, t + 0.2);
        oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.34);
        osc.connect(oscGain);
        oscGain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.35);

        // "...CHOO!" noise burst
        const len = Math.floor(this.ctx.sampleRate * 0.35);
        const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(2500, t + 0.33);
        filter.frequency.exponentialRampToValueAtTime(800, t + 0.65);
        filter.Q.setValueAtTime(1.2, t);
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0, t + 0.33);
        noiseGain.gain.linearRampToValueAtTime(0.7, t + 0.36);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.68);
        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.sfxGain);
        noise.start(t + 0.33);
        noise.stop(t + 0.7);
    }

    playBlaster() {
        if (!this.ctx || this.muted) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(1400, t);
        osc.frequency.exponentialRampToValueAtTime(180, t + 0.15);

        gain.gain.setValueAtTime(0.18, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.17);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(t);
        osc.stop(t + 0.18);
    }

    playPurchase() {
        if (!this.ctx || this.muted) return;
        const t = this.ctx.currentTime;
        // Cash-register "ka-ching"
        [1318.5, 1760].forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, t + idx * 0.08);
            gain.gain.setValueAtTime(0.25, t + idx * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.08 + 0.35);
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(t + idx * 0.08);
            osc.stop(t + idx * 0.08 + 0.36);
        });
    }

    playPowerUp() {
        if (!this.ctx || this.muted) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, t);
        osc.frequency.exponentialRampToValueAtTime(1320, t + 0.4);

        gain.gain.setValueAtTime(0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(t);
        osc.stop(t + 0.46);
    }

    // Twinkly rising arpeggio when a golden mouse appears
    playGoldenAppear() {
        if (!this.ctx || this.muted) return;
        const t = this.ctx.currentTime;
        [1046.5, 1318.5, 1568, 2093].forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, t + idx * 0.07);
            gain.gain.setValueAtTime(0.18, t + idx * 0.07);
            gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.07 + 0.4);
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(t + idx * 0.07);
            osc.stop(t + idx * 0.07 + 0.42);
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

export const sound = new SoundEngine();
