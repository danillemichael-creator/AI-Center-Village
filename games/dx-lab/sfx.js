(function () {
  var context = null, mutedState = false, storageKey = 'dxlab-muted';
  try { mutedState = window.localStorage.getItem(storageKey) === 'true'; } catch (e) {}

  function ensureContext() {
    if (!context) {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      try { context = new Ctx(); } catch (e) { return null; }
    }
    try {
      if (context.state === 'suspended' && context.resume) {
        var resumed = context.resume();
        if (resumed && resumed.catch) resumed.catch(function () {});
      }
    } catch (e) {}
    return context;
  }
  function note(ctx, frequency, duration, type, volume, delay, endFrequency) {
    try {
      var oscillator = ctx.createOscillator(), gain = ctx.createGain();
      var start = ctx.currentTime + (delay || 0);
      oscillator.type = type || 'square';
      oscillator.frequency.setValueAtTime(frequency, start);
      if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), start + duration);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(volume || 0.08, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      oscillator.connect(gain); gain.connect(ctx.destination);
      oscillator.start(start); oscillator.stop(start + duration + 0.02);
    } catch (e) {}
  }
  function noise(ctx, duration) {
    try {
      var length = Math.max(1, Math.floor(ctx.sampleRate * duration));
      var buffer = ctx.createBuffer(1, length, ctx.sampleRate), data = buffer.getChannelData(0);
      for (var i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
      var source = ctx.createBufferSource(), gain = ctx.createGain();
      source.buffer = buffer;
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      source.connect(gain); gain.connect(ctx.destination); source.start();
    } catch (e) {}
  }
  function play(name) {
    var ctx = ensureContext();
    if (!ctx || mutedState) return;
    try {
      if (name === 'jump') note(ctx, 420, 0.14, 'square', 0.055, 0, 760);
      else if (name === 'coin') {
        note(ctx, 988, 0.09, 'square', 0.06);
        note(ctx, 1318, 0.16, 'square', 0.055, 0.085);
      } else if (name === 'stomp') note(ctx, 170, 0.11, 'triangle', 0.09, 0, 95);
      else if (name === 'hurt') note(ctx, 380, 0.28, 'square', 0.075, 0, 75);
      else if (name === 'checkpoint') {
        note(ctx, 523, 0.12, 'triangle', 0.065);
        note(ctx, 659, 0.12, 'triangle', 0.065, 0.11);
        note(ctx, 784, 0.2, 'triangle', 0.07, 0.22);
      } else if (name === 'goal') {
        note(ctx, 523, 0.14, 'square', 0.055);
        note(ctx, 659, 0.14, 'square', 0.055, 0.13);
        note(ctx, 784, 0.14, 'triangle', 0.06, 0.26);
        note(ctx, 1047, 0.32, 'triangle', 0.07, 0.39);
      } else if (name === 'key') note(ctx, 760, 0.025, 'square', 0.025);
      else if (name === 'wrong') note(ctx, 145, 0.1, 'square', 0.06, 0, 105);
      else if (name === 'explode') noise(ctx, 0.28);
      else if (name === 'win') {
        note(ctx, 523, 0.18, 'triangle', 0.06);
        note(ctx, 659, 0.18, 'triangle', 0.06, 0.16);
        note(ctx, 784, 0.18, 'triangle', 0.065, 0.32);
        note(ctx, 1047, 0.38, 'triangle', 0.07, 0.48);
      }
    } catch (e) {}
  }
  function toggle() {
    mutedState = !mutedState;
    try { window.localStorage.setItem(storageKey, mutedState ? 'true' : 'false'); } catch (e) {}
    return mutedState;
  }
  function muted() { return mutedState; }

  window.addEventListener('keydown', function () { ensureContext(); });
  window.addEventListener('pointerdown', function () { ensureContext(); });
  window.DXSfx = { play: play, toggle: toggle, muted: muted };
})();
