(function () {
  window.AIVice = window.AIVice || {};
  var wanted = 'title';
  var flavor = null;
  var unlocked = false, built = false, current = null;
  var buses = {}, master = null, jingleSynth = null, hubFilter = null;
  var chalLeads = {}, chalLeadGains = {}, chalKicks = {}, chalSnares = {};
  var TRACK_KEY = 'ai-vice-track';
  var MASTER_VOL = 0.4;

  function muted() { return AIVice.isMuted ? AIVice.isMuted() : false; }
  function applyMute() { if (window.Tone) Tone.Destination.mute = muted(); }

  var FLAVORS = {
    'python-lab':   { kick: [['0:0:0'], ['0:2:0']],                    snare: [['0:1:0'], ['0:3:0']] },
    'robotics':     { kick: [['0:0:0'], ['0:1:0'], ['0:2:0'], ['0:3:0']], snare: [['0:1:0'], ['0:3:0']] },
    'dx-lab':       { kick: [['0:0:0'], ['0:2:0']],                    snare: [['0:1:0'], ['0:3:0'], ['0:3:2']] },
    'matrix-motel': { kick: [['0:0:0']],                               snare: [['0:1:0'], ['0:3:0'], ['0:3:3']] }
  };

  function part(cb, events) {
    var p = new Tone.Part(cb, events);
    p.loop = true;
    p.loopEnd = '1m';
    p.start(0);
    return p;
  }

  function build() {
    var T = window.Tone;
    var last = 'title';
    try { last = localStorage.getItem(TRACK_KEY) || 'title'; } catch (e) {}
    current = last;

    master = new T.Gain(0).toDestination();
    hubFilter = new T.Filter(1400, 'lowpass').connect(master);

    ['title', 'hub', 'challenge'].forEach(function (k) {
      var g = new T.Gain(k === last ? 1 : 0);
      buses[k] = g;
      g.connect(k === 'hub' ? hubFilter : master);
    });

    // ---------- TITLE: 90 BPM Am, dreamy ----------
    var titlePad = new T.PolySynth(T.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.8, decay: 0.4, sustain: 0.8, release: 2 }
    }).connect(buses.title);
    titlePad.volume.value = -15;
    var titlePadPart = new T.Part(function (time, chord) {
      titlePad.triggerAttackRelease(chord, '2m', time);
    }, [['0:0:0', ['A3', 'C4', 'E4']], ['2:0:0', ['F3', 'A3', 'C4']]]);
    titlePadPart.loop = true;
    titlePadPart.loopEnd = '4m';
    titlePadPart.start(0);

    var titleSub = new T.MonoSynth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.1, decay: 0.3, sustain: 0.7, release: 0.5 }
    }).connect(buses.title);
    titleSub.volume.value = -12;
    var titleSubPart = new T.Part(function (time, note) {
      titleSub.triggerAttackRelease(note, '2m', time);
    }, [['0:0:0', 'A1'], ['2:0:0', 'F1']]);
    titleSubPart.loop = true;
    titleSubPart.loopEnd = '4m';
    titleSubPart.start(0);

    var titleVerb = new T.Reverb({ decay: 3.2, wet: 0.7 }).connect(buses.title);
    var titleSnare = new T.NoiseSynth({
      noise: { type: 'pink' },
      envelope: { attack: 0.001, decay: 0.14, sustain: 0 }
    }).connect(titleVerb);
    part(function (time) { titleSnare.triggerAttackRelease('16n', time); }, [['0:2:0']]);

    var titleDelay = new T.PingPongDelay('4n.', 0.35).connect(buses.title);
    titleDelay.wet.value = 0.35;
    var titleArp = new T.Synth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.01, decay: 0.3, sustain: 0.2, release: 0.4 }
    }).connect(titleDelay);
    titleArp.volume.value = -16;
    new T.Sequence(function (time, note) {
      titleArp.triggerAttackRelease(note, '8n', time);
    }, ['A4', 'C5', 'E5', 'A5', 'E5', 'C5', 'G4', 'B4'], '8n').start(0);

    // ---------- HUB: 100 BPM Am, Miami Vice groove ----------
    var hubPad = new T.PolySynth(T.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.4, decay: 0.3, sustain: 0.7, release: 1.2 }
    }).connect(buses.hub);
    hubPad.volume.value = -14;
    var hubPadPart = new T.Part(function (time, chord) {
      hubPad.triggerAttackRelease(chord, '2n', time);
    }, [
      ['0:0:0', ['A3', 'C4', 'E4']], ['1:0:0', ['F3', 'A3', 'C4']],
      ['2:0:0', ['C3', 'E3', 'G3']], ['3:0:0', ['G3', 'B3', 'D4']]
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
    part(function (time) { hubSnare.triggerAttackRelease('16n', time); }, [['0:1:0'], ['0:3:0']]);

    var hubKick = new T.MembraneSynth({ pitchDecay: 0.02, octaves: 6 }).connect(buses.hub);
    hubKick.volume.value = -16;
    part(function (time) { hubKick.triggerAttackRelease('A0', '8n', time); }, [['0:0:0'], ['0:2:0']]);

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

    // ---------- CHALLENGE: 120 BPM Am, shared drive + per-game flavor ----------
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
    chalStab.volume.value = -18;
    part(function (time, chord) {
      chalStab.triggerAttackRelease(chord, '16n', time);
    }, [
      ['0:0:2', ['A3', 'C4', 'E4']], ['0:1:2', ['A3', 'C4', 'E4']],
      ['0:2:2', ['F3', 'A3', 'C4']], ['0:3:2', ['A3', 'C4', 'E4']]
    ]);

    var chalHat = new T.MetalSynth({
      envelope: { attack: 0.001, decay: 0.05, release: 0.05 },
      resonance: 8000
    }).connect(buses.challenge);
    chalHat.volume.value = -28;
    new T.Sequence(function (time) {
      chalHat.triggerAttackRelease('A6', '32n', time);
    }, [0, 1, 0, 1, 0, 1, 0, 1], '8n').start(0);

    var chalVerb = new T.Reverb({ decay: 1.8, wet: 0.5 }).connect(buses.challenge);

    Object.keys(FLAVORS).forEach(function (id) {
      var snare = new T.NoiseSynth({
        noise: { type: 'white' },
        envelope: { attack: 0.001, decay: 0.1, sustain: 0 }
      }).connect(chalVerb);
      chalSnares[id] = part(function (time) { snare.triggerAttackRelease('16n', time); }, FLAVORS[id].snare);
      var kick = new T.MembraneSynth({ pitchDecay: 0.03, octaves: 7 }).connect(buses.challenge);
      kick.volume.value = -14;
      chalKicks[id] = part(function (time) { kick.triggerAttackRelease('A0', '8n', time); }, FLAVORS[id].kick);
    });

    chalLeadGains['python-lab'] = new T.Gain(0).connect(buses.challenge);
    chalLeads['python-lab'] = new T.Synth({
      oscillator: { type: 'square' },
      envelope: { attack: 0.002, decay: 0.12, sustain: 0, release: 0.08 }
    }).connect(chalLeadGains['python-lab']);
    chalLeads['python-lab'].volume.value = -14;
    new T.Sequence(function (time, note) {
      chalLeads['python-lab'].triggerAttackRelease(note, '16n', time);
    }, ['A4', 'C5', 'E5', 'A5', 'E5', 'C5', 'A4', 'E4'], '16n').start(0);

    chalLeadGains['robotics'] = new T.Gain(0).connect(buses.challenge);
    var crush = new T.BitCrusher(4).connect(chalLeadGains['robotics']);
    chalLeads['robotics'] = new T.MonoSynth({
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.005, decay: 0.1, sustain: 0.3, release: 0.1 }
    }).connect(crush);
    chalLeads['robotics'].volume.value = -8;
    new T.Sequence(function (time, note) {
      chalLeads['robotics'].triggerAttackRelease(note, '8n', time);
    }, ['A1', 'A1', 'E2', 'A1', 'G1', 'A1', 'F1', 'E1'], '8n').start(0);

    chalLeadGains['dx-lab'] = new T.Gain(0).connect(buses.challenge);
    chalLeads['dx-lab'] = new T.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.02, decay: 0.2, sustain: 0.4, release: 0.2 }
    }).connect(chalLeadGains['dx-lab']);
    chalLeads['dx-lab'].volume.value = -12;
    new T.Sequence(function (time, note) {
      chalLeads['dx-lab'].triggerAttackRelease(note, '8n', time);
    }, ['A4', 'E4', 'A4', 'C5', 'B4', 'G4', 'A4', 'E4'], '8n').start(0);

    chalLeadGains['matrix-motel'] = new T.Gain(0).connect(buses.challenge);
    var dark = new T.Filter(900, 'lowpass').connect(chalLeadGains['matrix-motel']);
    chalLeads['matrix-motel'] = new T.Synth({
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.02, decay: 0.3, sustain: 0.5, release: 0.3 }
    }).connect(dark);
    chalLeads['matrix-motel'].detune.value = 25;
    chalLeads['matrix-motel'].volume.value = -12;
    new T.Sequence(function (time, note) {
      chalLeads['matrix-motel'].triggerAttackRelease(note, '4n', time);
    }, ['A3', 'C4', 'E3', 'G3'], '4n').start(0);

    jingleSynth = new T.PolySynth(T.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.01, decay: 0.3, sustain: 0.3, release: 0.5 }
    }).toDestination();
    jingleSynth.volume.value = -10;

    T.Transport.bpm.value = last === 'challenge' ? 120 : last === 'hub' ? 100 : 90;
    T.Transport.start();
    applyMute();
    built = true;
  }

  function applyFlavor(id) {
    if (!FLAVORS[id]) id = 'python-lab';
    flavor = id;
    if (!built) return;
    Object.keys(FLAVORS).forEach(function (k) {
      var on = k === id;
      chalKicks[k].mute = !on;
      chalSnares[k].mute = !on;
      chalLeadGains[k].gain.rampTo(on ? 1 : 0, 0.5);
    });
  }

  function setTrack(name) {
    if (!buses[name]) return;
    if (name === current) return;
    Object.keys(buses).forEach(function (k) {
      buses[k].gain.rampTo(k === name ? 1 : 0, 0.8);
    });
    Tone.Transport.bpm.rampTo(name === 'challenge' ? 120 : name === 'hub' ? 100 : 90, 0.8);
    current = name;
    try { localStorage.setItem(TRACK_KEY, name); } catch (e) {}
  }

  function unlock() {
    if (unlocked || !window.Tone) return;
    unlocked = true;
    Tone.start().then(function () {
      try { build(); } catch (e) { built = false; return; }
      if (flavor) applyFlavor(flavor);
      var prev = current;
      current = null;
      setTrack(wanted === prev ? 'hub' : wanted);
      if (wanted === prev) current = wanted;
      master.gain.rampTo(MASTER_VOL, 1);
    }).catch(function () { unlocked = false; });
  }

  var api = {
    play: function (name, flav) {
      wanted = buses[name] || ['title', 'hub', 'challenge'].indexOf(name) !== -1 ? name : 'title';
      if (flav) applyFlavor(flav);
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
      AIVice.setMuted ? AIVice.setMuted(!muted()) : null;
      applyMute();
      paintBtn();
    },
    isMuted: muted,
    brighten: function (on) {
      if (built && hubFilter) hubFilter.frequency.rampTo(on ? 6000 : 1400, 0.6);
    },
    current: function () { return current; }
  };
  AIVice.music = api;

  var btn;
  function paintBtn() {
    if (btn) {
      btn.textContent = muted() ? '✕' : '♪';
      btn.style.opacity = muted() ? '0.45' : '1';
    }
  }
  function injectBtn() {
    btn = document.createElement('button');
    btn.textContent = '♪';
    btn.setAttribute('aria-label', 'Toggle music');
    btn.style.cssText = 'position:fixed;bottom:12px;right:12px;z-index:9990;width:36px;height:36px;' +
      'border-radius:50%;border:2px solid #2ee6ff;background:rgba(10,5,24,.85);color:#2ee6ff;' +
      'cursor:pointer;font-size:16px;line-height:1;font-family:monospace;';
    btn.addEventListener('click', api.toggle);
    document.body.appendChild(btn);
    paintBtn();
  }
  if (document.body) injectBtn();
  else document.addEventListener('DOMContentLoaded', injectBtn);

  document.addEventListener('pointerdown', unlock, { once: true });
  document.addEventListener('keydown', unlock, { once: true });
})();
