// Retro synthesizer sound effects using the browser's Web Audio API
// Handles audio safely with a volume control, mute toggles, and user-interaction resume handlers.

let audioCtx: AudioContext | null = null;
let masterVolume: GainNode | null = null;
let ambientInterval: NodeJS.Timeout | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    masterVolume = audioCtx.createGain();
    masterVolume.gain.setValueAtTime(0.3, audioCtx.currentTime); // default comfortable volume
    masterVolume.connect(audioCtx.destination);
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

export const audioManager = {
  setSoundEffectsEnabled(enabled: boolean) {
    const ctx = getAudioContext();
    if (!ctx || !masterVolume) return;
    masterVolume.gain.setValueAtTime(enabled ? 0.35 : 0, ctx.currentTime);
  },

  // Wood block tick for general buttons
  playClick() {
    const ctx = getAudioContext();
    if (!ctx || !masterVolume) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.6, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(masterVolume);

    osc.start();
    osc.stop(ctx.currentTime + 0.09);
  },

  // Gold coin clink sound effect
  playCoin() {
    const ctx = getAudioContext();
    if (!ctx || !masterVolume) return;

    const now = ctx.currentTime;
    
    // First high pitch bell pulse
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(1400, now);
    osc1.frequency.exponentialRampToValueAtTime(2000, now + 0.05);
    gain1.gain.setValueAtTime(0.4, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    
    osc1.connect(gain1);
    gain1.connect(masterVolume);
    osc1.start(now);
    osc1.stop(now + 0.2);

    // Second slightly delayed clink element
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(1800, now + 0.03);
    gain2.gain.setValueAtTime(0.3, now + 0.03);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

    osc2.connect(gain2);
    gain2.connect(masterVolume);
    osc2.start(now + 0.03);
    osc2.stop(now + 0.26);
  },

  // Card slide rustle (frequency white noise sweep)
  playCardDeal() {
    const ctx = getAudioContext();
    if (!ctx || !masterVolume) return;

    const now = ctx.currentTime;
    const bufferSize = ctx.sampleRate * 0.12; // 120ms noise
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noiseNode = ctx.createBufferSource();
    noiseNode.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1200, now);
    filter.frequency.exponentialRampToValueAtTime(300, now + 0.12);
    filter.Q.setValueAtTime(3.0, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

    noiseNode.connect(filter);
    filter.connect(gain);
    gain.connect(masterVolume);

    noiseNode.start(now);
    noiseNode.stop(now + 0.13);
  },

  // High quality major chord arpeggio victory fanfare
  playWin() {
    const ctx = getAudioContext();
    if (!ctx || !masterVolume) return;

    const now = ctx.currentTime;
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // C Major arpeggio
    
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now + idx * 0.07);
      
      gain.gain.setValueAtTime(0.15, now + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.07 + 0.4);
      
      osc.connect(gain);
      gain.connect(masterVolume!);
      
      osc.start(now + idx * 0.07);
      osc.stop(now + idx * 0.07 + 0.45);
    });
  },

  // Sorrowful minor falling sweep for loss/gameover
  playLose() {
    const ctx = getAudioContext();
    if (!ctx || !masterVolume) return;

    const now = ctx.currentTime;
    const notes = [392.00, 349.23, 311.13, 261.63]; // G, F, Eb, C (C Minor falling)

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, now + idx * 0.15);
      osc.frequency.linearRampToValueAtTime(freq - 30, now + idx * 0.15 + 0.25);

      gain.gain.setValueAtTime(0.12, now + idx * 0.15);
      gain.gain.linearRampToValueAtTime(0.001, now + idx * 0.15 + 0.28);

      osc.connect(gain);
      gain.connect(masterVolume!);

      osc.start(now + idx * 0.15);
      osc.stop(now + idx * 0.15 + 0.3);
    });
  },

  // Warning low buzz for mistakes or bust
  playBust() {
    const ctx = getAudioContext();
    if (!ctx || !masterVolume) return;

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = "sawtooth";
    osc1.frequency.setValueAtTime(110, now);
    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(112, now); // subtle detune for gritty buzz

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(masterVolume);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.4);
    osc2.stop(now + 0.4);
  },

  // Soft rustic acoustic guitar background loop (strums every 4 seconds)
  startAmbientBackground() {
    this.stopAmbientBackground();
    
    const playStrum = () => {
      const ctx = getAudioContext();
      if (!ctx || !masterVolume) return;

      const now = ctx.currentTime;
      // Cowboy warm guitar notes: G, B, D, G chord plucked
      const freqs = [196.00, 246.94, 293.66, 392.00];
      
      freqs.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "triangle";
        // staggered pluck timing (15ms delay per string)
        const pluckTime = now + (index * 0.02);
        osc.frequency.setValueAtTime(freq, pluckTime);

        gain.gain.setValueAtTime(0.05, pluckTime);
        gain.gain.exponentialRampToValueAtTime(0.001, pluckTime + 1.8);

        osc.connect(gain);
        gain.connect(masterVolume!);

        osc.start(pluckTime);
        osc.stop(pluckTime + 2.0);
      });
    };

    // Strum initially and set interval
    playStrum();
    ambientInterval = setInterval(playStrum, 5500);
  },

  stopAmbientBackground() {
    if (ambientInterval) {
      clearInterval(ambientInterval);
      ambientInterval = null;
    }
  }
};
