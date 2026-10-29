(function () {
  window.AIVice = window.AIVice || {};
  var wanted = 'hub';
  var unlocked = false;
  var built = false;
  var current = null;
  var buses = {};
  var jingleSynth = null;

  function muted() { return AIVice.isMuted ? AIVice.isMuted() : false; }

  function applyMute() {
    if (window.Tone) Tone.Destination.mute = muted();
  }

  function build() {
    var T = window.Tone;
    buses.hub = new T.Gain(1).toDestination();
    buses.challenge = new T.Gain(0).toDestination();

    // ---- HUB: 100 BPM A minor, Miami Vice groove ----
    var hubPad = new T.PolySynth(T.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.4, decay: 0.3, sustain: 0.7, release: 1.2 }
    }).connect(buses.hub);
    hubPad.volume.value = -14;
    var hubPadPart = new T.Part(function (time, chord) {
      hubPad.triggerAttackRelease(chord, '2n', time);
    }, [
      ['0:0:0', ['A3', 'C4', 'E4']],
      ['1:0:0', ['F3', 'A3', 'C4']],
      ['2:0:0', ['C3', 'E3', 'G3']],
      ['3:0:0', ['G3', 'B3', 'D4']]
    ]);
    hubPadPart.loop = true;
    hubPadPart.loopEnd = '4m';
    hubPadPart.start(0);

    var hubBass = new T.MonoSynth({
      oscillator: { type: 'sawtooth' },
      filter: { Q: 2, type: 'lowpass', rolloff: -24 },
      envelope: { attack: 0.01, decay: 0.2, sustain: 0.4, release: 0.15 },
      filterEnvelope: { attack: 0.01, decay: 0.15, sustain: 0.5, baseFrequency: 120, octaves: 3 }
    }).connect(buses.hub);
    hubBass.volume.value = -10;
    new T.Sequence(function (time, note) {
      if (note) hubBass.triggerAttackRelease(note, '8n', time);
    }, ['A1', null, 'A1', null, 'C2', 'A1', null, 'G1',
        'A1', null, 'E2', null, 'D2', 'C2', 'A1', null], '8n').start(0);

    var hubVerb = new T.Reverb({ decay: 2.8, wet: 0.7 }).connect(buses.hub);
    var hubSnare = new T.NoiseSynth({
      noise: { type: 'pink' },
      envelope: { attack: 0.001, decay: 0.12, sustain: 0 }
    }).connect(hubVerb);
    var hubSnarePart = new T.Part(function (time) {
      hubSnare.triggerAttackRelease('16n', time);
    }, [['0:1:0'], ['0:3:0']]);
    hubSnarePart.loop = true;
    hubSnarePart.loopEnd = '1m';
    hubSnarePart.start(0);

    var hubKick = new T.MembraneSynth({ pitchDecay: 0.02, octaves: 6 }).connect(buses.hub);
    hubKick.volume.value = -16;
    var hubKickPart = new T.Part(function (time) {
      hubKick.triggerAttackRelease('A0', '8n', time);
    }, [['0:0:0'], ['0:2:0']]);
    hubKickPart.loop = true;
    hubKickPart.loopEnd = '1m';
    hubKickPart.start(0);

    var hubDelay = new T.PingPongDelay('8n.', 0.3).connect(buses.hub);
    hubDelay.wet.value = 0.25;
    var hubArp = new T.Synth({
      oscillator: { type: 'square' },
      envelope: { attack: 0.005, decay: 0.15, sustain: 0.2, release: 0.2 }
    }).connect(hubDelay);
    hubArp.volume.value = -18;
    new T.Sequence(function (time, note) {
      hubArp.triggerAttackRelease(note, '16n', time);
    }, ['A4', 'C5', 'E5', 'A5', 'G5', 'E5', 'C5', 'E5'], '16n').start(0);

    // ---- CHALLENGE: 120 BPM A minor, driving/tense ----
    var chalBass = new T.MonoSynth({
      oscillator: { type: 'square' },
      filter: { Q: 3, type: 'lowpass' },
      envelope: { attack: 0.005, decay: 0.1, sustain: 0.5, release: 0.1 }
    }).connect(buses.challenge);
    chalBass.volume.value = -10;
    new T.Sequence(function (time, note) {
      if (note) chalBass.triggerAttackRelease(note, '16n', time);
    }, ['A1', 'A1', 'A2', 'A1', 'A1', 'G1', 'A1', 'A1',
        'A1', 'A1', 'F2', 'A1', 'G1', 'A1', 'E1', 'A1'], '16n').start(0);

    var chalStab = new T.PolySynth(T.Synth, {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.005, decay: 0.12, sustain: 0, release: 0.1 }
    }).connect(buses.challenge);
    chalStab.volume.value = -16;
    var chalStabPart = new T.Part(function (time, chord) {
      chalStab.triggerAttackRelease(chord, '16n', time);
    }, [
      ['0:0:2', ['A3', 'C4', 'E4']], ['0:1:2', ['A3', 'C4', 'E4']],
      ['0:2:2', ['F3', 'A3', 'C4']], ['0:3:2', ['A3', 'C4', 'E4']]
    ]);
    chalStabPart.loop = true;
    chalStabPart.loopEnd = '1m';
    chalStabPart.start(0);

    var chalVerb = new T.Reverb({ decay: 1.8, wet: 0.5 }).connect(buses.challenge);
    var chalSnare = new T.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.1, sustain: 0 }
    }).connect(chalVerb);
    var chalSnarePart = new T.Part(function (time) {
      chalSnare.triggerAttackRelease('16n', time);
    }, [['0:1:0'], ['0:3:0'], ['0:3:2']]);
    chalSnarePart.loop = true;
    chalSnarePart.loopEnd = '1m';
    chalSnarePart.start(0);

    var chalHat = new T.MetalSynth({
      envelope: { attack: 0.001, decay: 0.05, release: 0.05 },
      resonance: 8000
    }).connect(buses.challenge);
    chalHat.volume.value = -26;
    new T.Sequence(function (time) {
      chalHat.triggerAttackRelease('A6', '32n', time);
    }, [0, 1, 0, 1, 0, 1, 0, 1], '8n').start(0);

    var chalArp = new T.Synth({
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.004, decay: 0.1, sustain: 0.1, release: 0.1 }
    }).connect(buses.challenge);
    chalArp.volume.value = -20;
    new T.Sequence(function (time, note) {
      chalArp.triggerAttackRelease(note, '16n', time);
    }, ['A4', 'B4', 'C5', 'E5', 'G5', 'A5', 'G5', 'E5'], '16n').start(0);

    jingleSynth = new T.PolySynth(T.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.01, decay: 0.3, sustain: 0.3, release: 0.5 }
    }).toDestination();
    jingleSynth.volume.value = -10;

    T.Transport.start();
    applyMute();
    built = true;
  }

  function setTrack(name) {
    if (name === current || !built) return;
    var T = window.Tone;
    var FADE = 0.8;
    Object.keys(buses).forEach(function (k) {
      buses[k].gain.rampTo(k === name ? 1 : 0, FADE);
    });
    T.Transport.bpm.rampTo(name === 'challenge' ? 120 : 100, FADE);
    current = name;
  }

  function unlock() {
    if (unlocked || !window.Tone) return;
    unlocked = true;
    Tone.start().then(function () {
      try { build(); } catch (e) { built = false; return; }
      setTrack(wanted);
    }).catch(function () { unlocked = false; });
  }

  AIVice.music = {
    play: function (name) {
      wanted = name === 'challenge' ? 'challenge' : 'hub';
      if (built) setTrack(wanted);
    },
    jingle: function () {
      if (!built || !jingleSynth) return;
      var notes = ['A3', 'C4', 'E4', 'A4', 'C5', 'E5', 'A5'];
      var now = Tone.now();
      notes.forEach(function (n, i) {
        jingleSynth.triggerAttackRelease(n, '8n', now + i * 0.28);
      });
      jingleSynth.triggerAttackRelease(['A4', 'E5', 'A5'], '2n', now + notes.length * 0.28);
    },
    toggle: function () {
      AIVice.setMuted(!muted());
      applyMute();
    },
    isMuted: muted
  };

  document.addEventListener('pointerdown', unlock, { once: true });
  document.addEventListener('keydown', unlock, { once: true });
})();
