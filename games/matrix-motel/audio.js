/**
 * Plain JavaScript port of src/game/audio.ts.
 */
let muted = false;
let ctx = null;
function setMuted(value) {
  muted = value;
}
function isMuted() {
  return muted;
}
function context() {
  if (muted || typeof window === "undefined") return null;
  const AudioCtx = window.AudioContext;
  if (!ctx) ctx = new AudioCtx();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}
function tone(freq, duration, type, gainValue, slideTo) {
  const audio = context();
  if (!audio) return;
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(freq, audio.currentTime);
  if (slideTo) {
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(40, slideTo),
      audio.currentTime + duration
    );
  }
  gain.gain.setValueAtTime(gainValue, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(1e-4, audio.currentTime + duration);
  oscillator.connect(gain);
  gain.connect(audio.destination);
  oscillator.start();
  oscillator.stop(audio.currentTime + duration + 0.02);
}
const sfx = {
  on() {
    tone(680, 0.05, "square", 0.035);
  },
  off() {
    tone(180, 0.07, "square", 0.04);
  },
  deny() {
    tone(90, 0.12, "sawtooth", 0.03);
  },
  infect() {
    tone(520, 0.16, "square", 0.04, 80);
  },
  block() {
    tone(220, 0.09, "square", 0.04, 520);
  },
  tick() {
    tone(880, 0.035, "square", 0.025);
  },
  ready() {
    tone(740, 0.07, "square", 0.035);
  },
  ui() {
    tone(440, 0.04, "square", 0.03);
  },
  win() {
    tone(523, 0.1, "square", 0.04);
    window.setTimeout(() => tone(659, 0.1, "square", 0.04), 110);
    window.setTimeout(() => tone(784, 0.1, "square", 0.045), 220);
    window.setTimeout(() => tone(1046, 0.2, "square", 0.05), 330);
  },
  lose() {
    tone(280, 0.22, "sawtooth", 0.04, 55);
  }
};
export {
  isMuted,
  setMuted,
  sfx
};
