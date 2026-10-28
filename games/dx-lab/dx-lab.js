(function () {
  var GAME_ID = 'dx-lab';
  var app = document.getElementById('app');

  // ---------- Pixel "photos" ----------
  var ART = {
    palm1: [
      '..gg..gg....',
      '.gggggggg...',
      'gg.ggggg.gg.',
      'g...gbg...g.',
      '....cbc.....',
      '.....b......',
      '.....b......',
      '.....b......',
      '.....b......',
      '....bbb.....',
      'ssssssssssss',
      'ssssssssssss'
    ],
    palm2: [
      '......gg.gg.',
      '....ggggggg.',
      '...gg.gggg.g',
      '...g..cbgg..',
      '.......b....',
      '......b.....',
      '......b.....',
      '.....b......',
      '.....b......',
      '....bbb.....',
      'ssssssssssss',
      'ssssssssssss'
    ],
    palm3: [
      '............',
      '..GG....GG..',
      '.GGGGggGGGG.',
      'GG..GggG..GG',
      'G...cbbc...G',
      '.....bb.....',
      '.....bb.....',
      '.....bb.....',
      '....bbbb....',
      'ssssssssssss',
      'ssssssssssss',
      'ssssssssssss'
    ],
    car: [
      '............',
      '............',
      '............',
      '............',
      '...ppppp....',
      '..pp.aa.pp..',
      '.pppppppppp.',
      '.pppppppppp.',
      '..kk....kk..',
      'ssssssssssss',
      'ssssssssssss',
      'ssssssssssss'
    ],
    building: [
      '...xxxxxx...',
      '...xaxxax...',
      '...xxxxxx...',
      '...xaxxax...',
      '...xxxxxx...',
      '...xaxxax...',
      '...xxxxxx...',
      '...xaxxax...',
      '...xxxxxx...',
      '...xxkkxx...',
      'ssssssssssss',
      'ssssssssssss'
    ],
    flamingo: [
      '....pp......',
      '...pppk.....',
      '....pp......',
      '....p.......',
      '....p.......',
      '...pppp.....',
      '..pppppp....',
      '...pppp.....',
      '.....k......',
      '.....k......',
      'ssssssssssss',
      'ssssssssssss'
    ],
    cactus: [
      '............',
      '.....gg.....',
      '.....gg.....',
      '.g...gg.....',
      '.gg..gg..g..',
      '..ggggg..g..',
      '.....gggg...',
      '.....gg.....',
      '.....gg.....',
      '.....gg.....',
      'ssssssssssss',
      'ssssssssssss'
    ],
    ball: [
      '............',
      '....yyyy....',
      '...yyyyyy...',
      '..yyyyyyyy..',
      '..yyyyyyyy..',
      '..yyyyyyyy..',
      '..yyyyyyyy..',
      '...yyyyyy...',
      '....yyyy....',
      '............',
      'ssssssssssss',
      'ssssssssssss'
    ],
    surfboard: [
      '.....aa.....',
      '....aaaa....',
      '....awwa....',
      '....aaaa....',
      '....awwa....',
      '....aaaa....',
      '....aaaa....',
      '....awwa....',
      '....aaaa....',
      '.....aa.....',
      'ssssssssssss',
      'ssssssssssss'
    ]
  };

  var NAMES = {
    palm1: 'palm tree', palm2: 'leaning palm', palm3: 'short palm', car: 'pink car',
    building: 'hotel', flamingo: 'flamingo', cactus: 'cactus', ball: 'beach ball', surfboard: 'surfboard'
  };

  var COLORS = {
    g: '#39ff88', G: '#14b85a', b: '#9a5b2e', c: '#5a3418', p: '#ff5fc8', k: '#1a1a1a',
    w: '#ffffff', y: '#ffd23f', a: '#2ee6ff', x: '#8a8fa8', s: '#f2d38b'
  };
  var SKY = { day: '#8fdcff', night: '#3a1660' };
  var CATEGORY = { g: 'green', G: 'green', b: 'brown', c: 'brown', p: 'pink', y: 'yellow', a: 'aqua', x: 'gray', k: 'gray', w: 'gray', s: 'sand' };
  var DIMS = ['green', 'brown', 'pink', 'yellow', 'aqua', 'gray', 'sand', 'day', 'night'];

  var uid = 0;
  function photo(kind, time, mirror) {
    var grid = ART[kind].map(function (r) {
      r = (r + '............').slice(0, 12);
      return mirror ? r.split('').reverse().join('') : r;
    });
    var counts = {};
    DIMS.forEach(function (d) { counts[d] = 0; });
    grid.forEach(function (row) {
      row.split('').forEach(function (ch) {
        counts[ch === '.' ? time : CATEGORY[ch]]++;
      });
    });
    return {
      uid: 'p' + (uid++), kind: kind, time: time, grid: grid,
      palm: kind.indexOf('palm') === 0,
      name: (time === 'night' ? 'night ' : '') + NAMES[kind],
      features: DIMS.map(function (d) { return counts[d] / 144; })
    };
  }

  function drawPhoto(canvas, p) {
    canvas.width = 12; canvas.height = 12;
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = SKY[p.time];
    ctx.fillRect(0, 0, 12, 12);
    if (p.time === 'night') { ctx.fillStyle = '#fff'; ctx.fillRect(1, 1, 1, 1); ctx.fillRect(9, 2, 1, 1); }
    p.grid.forEach(function (row, y) {
      row.split('').forEach(function (ch, x) {
        if (ch === '.') return;
        ctx.fillStyle = COLORS[ch];
        ctx.fillRect(x, y, 1, 1);
      });
    });
  }

  // ---------- The model: 1-nearest-neighbor ----------
  function distance(a, b) {
    var s = 0;
    for (var i = 0; i < a.length; i++) s += (a[i] - b[i]) * (a[i] - b[i]);
    return Math.sqrt(s);
  }
  function predict(train, p) {
    if (!train.length) return null;
    var best = null, bd = Infinity;
    train.forEach(function (t) {
      var d = distance(t.photo.features, p.features);
      if (d < bd) { bd = d; best = t; }
    });
    return best.label;
  }
  function evaluate(train, tests) {
    var correct = 0;
    var preds = tests.map(function (p) {
      var guess = predict(train, p);
      if (guess === p.palm) correct++;
      return guess;
    });
    return { preds: preds, acc: train.length ? correct / tests.length : 0 };
  }

  // ---------- Helpers ----------
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function refreshTokens() { document.getElementById('tokens').textContent = AIVice.getTokens(); }
  function setStep(t) { document.getElementById('step').textContent = t ? '· ' + t : ''; }

  // ---------- Intro ----------
  function intro() {
    setStep('');
    app.innerHTML = '';
    var c = el('div', 'card intro');
    c.innerHTML =
      '<h2>Welcome to the DX Lab</h2>' +
      '<p class="lead">Midnight on Ocean Drive. The lab\'s new AI can\'t tell a palm tree from a pink Cadillac. Your job: teach it. Pick a level:</p>' +
      (AIVice.isComplete(GAME_ID) ? '<p class="tip">★ You already beat the DX Lab. Replay any level to practice.</p>' : '<p class="tip">Clear either level to earn 50 AI tokens. Bonus tokens for a perfect quiz and for beating Data Dash.</p>');
    var levels = el('div', 'levels');
    var defs = [
      { name: 'Sort Lab', tag: 'PUZZLE · 4 ROUNDS', text: 'Build a training set, fix a biased dataset, engineer the perfect prompt, then a quick quiz.', go: round1 },
      { name: 'Data Dash', tag: 'PLATFORMER', text: 'Run and jump down Ocean Drive. Grab correctly labeled photos, skip bad data, stomp glitch bugs.', go: function () { if (window.DXLab.startDash) window.DXLab.startDash(); }, soon: true }
    ];
    defs.forEach(function (d) {
      var l = el('button', 'level card');
      l.innerHTML = '<span class="pixel lv-tag">' + d.tag + '</span><span class="lv-name neon">' + d.name + '</span><span class="lv-text">' + d.text + '</span>';
      l.onclick = d.go;
      if (d.soon && !window.DXLab.startDash) { l.disabled = true; l.querySelector('.lv-tag').textContent = d.tag + ' · COMING SOON'; }
      levels.appendChild(l);
    });
    c.appendChild(levels);
    app.appendChild(c);
  }

  // ---------- Shared training-lab UI ----------
  // cfg: { title, text, pool, train, tests, goal, minTrain, showBalance, insight, next }
  function trainingLab(cfg) {
    var state = { pool: cfg.pool.slice(), train: cfg.train.slice(), selected: null, solved: false };
    app.innerHTML = '';

    var head = el('div', 'card panel intro');
    head.innerHTML = '<h2>' + cfg.title + '</h2>' + cfg.text;
    app.appendChild(head);

    var lab = el('div', 'lab');
    var poolWrap = el('div', 'zone-wrap pool full');
    poolWrap.appendChild(el('h3', '', 'PHOTO PILE — drag (or click, then click a bin)'));
    var poolZone = el('div', 'zone');
    poolWrap.appendChild(poolZone);

    var palmWrap = el('div', 'zone-wrap palm');
    palmWrap.appendChild(el('h3', '', 'TRAINING SET: PALM TREE'));
    var palmZone = el('div', 'zone');
    palmWrap.appendChild(palmZone);

    var notWrap = el('div', 'zone-wrap notpalm');
    notWrap.appendChild(el('h3', '', 'TRAINING SET: NOT PALM TREE'));
    var notZone = el('div', 'zone');
    notWrap.appendChild(notZone);

    lab.appendChild(poolWrap);
    lab.appendChild(palmWrap);
    lab.appendChild(notWrap);

    var meterCard = el('div', 'card meter-wrap full');
    meterCard.innerHTML =
      '<h3 class="pixel" style="margin:0 0 8px;color:var(--sun)">TEST ACCURACY — photos the model has never seen</h3>' +
      '<div class="meter-row"><div class="meter"><div class="fill"></div><div class="goal"></div></div><div class="pct">0%</div></div>' +
      '<div class="meter-note"></div><div class="balance-slot"></div><div class="tests"></div>';
    lab.appendChild(meterCard);
    app.appendChild(lab);

    var insightSlot = el('div');
    app.appendChild(insightSlot);
    var actions = el('div', 'actions');
    var nextBtn = el('button', 'btn', cfg.nextLabel || 'NEXT ROUND');
    nextBtn.disabled = true;
    nextBtn.onclick = cfg.next;
    actions.appendChild(nextBtn);
    app.appendChild(actions);

    meterCard.querySelector('.goal').style.left = (cfg.goal * 100) + '%';

    function findAndRemove(uid) {
      var i;
      for (i = 0; i < state.pool.length; i++) if (state.pool[i].uid === uid) return state.pool.splice(i, 1)[0];
      for (i = 0; i < state.train.length; i++) if (state.train[i].photo.uid === uid) return state.train.splice(i, 1)[0].photo;
      return null;
    }
    function move(uid, dest) {
      var p = findAndRemove(uid);
      if (!p) return;
      if (dest === 'pool') state.pool.push(p);
      else state.train.push({ photo: p, label: dest === 'palm' });
      state.selected = null;
      render();
    }

    function card(p, label) {
      var d = el('div', 'item' + (state.selected === p.uid ? ' sel' : ''));
      d.draggable = true;
      var cv = document.createElement('canvas');
      drawPhoto(cv, p);
      d.appendChild(cv);
      d.appendChild(el('div', 'cap', p.name));
      if (label != null && label !== p.palm) {
        var t = el('span', 'tag', 'WRONG?');
        t.style.color = 'var(--pink)';
        t.title = 'This label looks wrong';
        if (cfg.flagWrong) d.appendChild(t);
      }
      d.addEventListener('dragstart', function (e) { e.dataTransfer.setData('text/plain', p.uid); });
      d.addEventListener('click', function (e) {
        if (state.selected && state.selected !== p.uid) return;
        e.stopPropagation();
        state.selected = state.selected === p.uid ? null : p.uid;
        render();
      });
      return d;
    }

    function wireZone(zone, dest) {
      zone.addEventListener('dragover', function (e) { e.preventDefault(); zone.classList.add('over'); });
      zone.addEventListener('dragleave', function () { zone.classList.remove('over'); });
      zone.addEventListener('drop', function (e) {
        e.preventDefault();
        zone.classList.remove('over');
        move(e.dataTransfer.getData('text/plain'), dest);
      });
      zone.addEventListener('click', function () { if (state.selected) move(state.selected, dest); });
    }
    wireZone(poolZone, 'pool');
    wireZone(palmZone, 'palm');
    wireZone(notZone, 'notpalm');

    function render() {
      [poolZone, palmZone, notZone].forEach(function (z) {
        z.innerHTML = '';
        z.classList.toggle('target', !!state.selected);
      });
      state.pool.forEach(function (p) { poolZone.appendChild(card(p, null)); });
      if (!state.pool.length) poolZone.appendChild(el('span', 'meter-note', 'Pile is empty.'));
      state.train.forEach(function (t) { (t.label ? palmZone : notZone).appendChild(card(t.photo, t.label)); });

      var r = evaluate(state.train, cfg.tests);
      var pct = Math.round(r.acc * 100);
      meterCard.querySelector('.fill').style.width = pct + '%';
      meterCard.querySelector('.pct').textContent = pct + '%';

      var testsEl = meterCard.querySelector('.tests');
      testsEl.innerHTML = '';
      cfg.tests.forEach(function (p, i) {
        var g = r.preds[i];
        var t = el('div', 'test' + (g == null ? '' : g === p.palm ? ' ok' : ' bad'));
        var cv = document.createElement('canvas');
        drawPhoto(cv, p);
        t.appendChild(cv);
        t.appendChild(el('div', 'guess', g == null ? '?' : g ? 'PALM' : 'NOT PALM'));
        testsEl.appendChild(t);
      });

      var note = meterCard.querySelector('.meter-note');
      var need = Math.max(0, cfg.minTrain - state.train.length);
      if (!state.train.length) note.textContent = 'No training data yet — the model can only guess "?".';
      else if (need) note.textContent = 'Model trained on ' + state.train.length + ' example(s). Add at least ' + need + ' more. Goal: ' + Math.round(cfg.goal * 100) + '%.';
      else note.textContent = 'Model trained on ' + state.train.length + ' examples. Each test photo gets the label of its most similar training photo. Goal: ' + Math.round(cfg.goal * 100) + '%.';

      if (cfg.showBalance) {
        var c = { pd: 0, pn: 0, nd: 0, nn: 0 };
        state.train.forEach(function (t) { c[(t.label ? 'p' : 'n') + (t.photo.time === 'day' ? 'd' : 'n')]++; });
        function td(n) { return '<td class="' + (n ? 'okc' : 'zero') + '">' + n + '</td>'; }
        meterCard.querySelector('.balance-slot').innerHTML =
          '<table class="balance"><tr><th></th><th>DAY</th><th>NIGHT</th></tr>' +
          '<tr><th>PALM</th>' + td(c.pd) + td(c.pn) + '</tr>' +
          '<tr><th>NOT PALM</th>' + td(c.nd) + td(c.nn) + '</tr></table>';
      }

      var ok = r.acc >= cfg.goal && state.train.length >= cfg.minTrain;
      nextBtn.disabled = !ok;
      if (ok && !state.solved) {
        state.solved = true;
        var ins = el('div', 'card insight', cfg.insight);
        insightSlot.appendChild(ins);
      }
    }

    document.addEventListener('click', function clear(e) {
      if (!app.contains(lab)) { document.removeEventListener('click', clear); return; }
      if (state.selected && !lab.contains(e.target)) { state.selected = null; render(); }
    });
    render();
  }

  // ---------- Round 1: train ----------
  function round1() {
    setStep('ROUND 1/4 · TRAIN');
    trainingLab({
      title: 'Round 1: Build a training set',
      text:
        '<p class="lead">A <span class="term">model</span> learns from <span class="term">training data</span>: examples that a human has labeled.</p>' +
        '<p>Sort the photo pile into <b style="color:#39ff88">PALM TREE</b> or <b style="color:var(--pink)">NOT PALM TREE</b>. ' +
        'Our model compares each new test photo to your training photos and copies the label of the closest match: that\'s its <span class="term">prediction</span>.</p>' +
        '<p class="tip">Reach 85% test accuracy with at least 6 training photos. Try mislabeling one on purpose and watch what happens.</p>',
      pool: [
        photo('palm1', 'day', false), photo('car', 'day', false), photo('cactus', 'day', false),
        photo('palm2', 'day', false), photo('building', 'day', false), photo('flamingo', 'day', true),
        photo('palm3', 'day', true), photo('ball', 'day', false), photo('surfboard', 'day', false),
        photo('palm1', 'day', true)
      ],
      train: [],
      tests: [
        photo('palm2', 'day', true), photo('car', 'day', true), photo('palm3', 'day', false), photo('cactus', 'day', true),
        photo('building', 'day', false), photo('palm1', 'day', false), photo('flamingo', 'day', false), photo('surfboard', 'day', true)
      ],
      goal: 0.85,
      minTrain: 6,
      flagWrong: false,
      insight:
        '<h3>Model trained!</h3>' +
        '<p><span class="term">Accuracy</span> = correct predictions ÷ total test photos. We test on photos the model has <i>never seen</i>, so we know it learned the pattern and didn\'t just memorize answers.</p>' +
        '<p>Notice the cactus: green like a palm, but no trunk. Without a cactus in the training data, the model would guess "palm tree". Variety in your examples matters.</p>',
      next: round2
    });
  }

  // ---------- Round 2: bias ----------
  function round2() {
    setStep('ROUND 2/4 · BIAS');
    trainingLab({
      title: 'Round 2: The biased dataset',
      text:
        '<p class="lead">A rookie trained the model on just 4 photos. Every palm tree was shot in the <b>day</b>, every other photo at <b>night</b>.</p>' +
        '<p>Look at the test results: the model calls night-time palms "not palm" and daytime cars "palm". It learned a shortcut, <i>"blue sky = palm tree"</i>, because of <span class="term">bias</span> in its training data.</p>' +
        '<p class="tip">Fix the data: add photos from the pile so every box in the DAY/NIGHT table has examples. Reach 100% test accuracy. You can also drag photos out of the training set.</p>',
      pool: [
        photo('palm1', 'night', true), photo('car', 'day', false), photo('palm3', 'night', true),
        photo('building', 'day', true), photo('flamingo', 'day', false), photo('palm2', 'night', false),
        photo('surfboard', 'night', true), photo('cactus', 'night', false), photo('ball', 'night', false)
      ],
      train: [
        { photo: photo('palm1', 'day', false), label: true },
        { photo: photo('palm2', 'day', false), label: true },
        { photo: photo('car', 'night', false), label: false },
        { photo: photo('building', 'night', false), label: false }
      ],
      tests: [
        photo('palm1', 'night', false), photo('car', 'day', true), photo('palm3', 'night', false), photo('building', 'day', false),
        photo('palm2', 'day', true), photo('flamingo', 'night', false), photo('palm3', 'day', false), photo('surfboard', 'night', false)
      ],
      goal: 1,
      minTrain: 6,
      showBalance: true,
      flagWrong: true,
      insight:
        '<h3>Bias busted!</h3>' +
        '<p>With too little data, and data that was <span class="term">biased</span> (palms only by day), the model latched onto the wrong clue: the sky color. ' +
        'Real AI systems fail the same way, e.g. face recognition trained mostly on one group of people.</p>' +
        '<p>Fix: collect <b>more</b> data, and make it <b>balanced</b> and <b>representative</b> of the real world the model will see.</p>',
      next: round3
    });
  }

  // ---------- Round 3: prompt lab ----------
  var LIB = {
    palm: {
      label: 'palm trees',
      sentence: 'Palm trees bend in strong winds instead of snapping.',
      haiku: 'Tall palm in the wind\nfronds wave at the neon moon\nroots hold the warm sand',
      bullets: '- Look for the tall trunk\n- Fronds fan out at the top\n- Coconuts hang under the fronds'
    },
    ocean: {
      label: 'the ocean',
      sentence: 'The ocean covers about 71% of Earth\'s surface.',
      haiku: 'Waves fold under stars\nsalt wind hums a synth bassline\nthe tide keeps the beat',
      bullets: '- Swim near a lifeguard\n- Watch for rip currents\n- Wear reef-safe sunscreen'
    },
    cars: {
      label: 'neon cars',
      sentence: 'Neon underglow makes a car look like it floats on light.',
      haiku: 'Pink chrome on the drive\nheadlights paint the palm trees gold\nengines purr at dusk',
      bullets: '- Cruise slow on Ocean Drive\n- Park under the palm lights\n- Keep the synthwave loud'
    }
  };
  var SLOTS = {
    role: { label: 'ROLE', opts: { guide: 'Miami tour guide', pirate: 'pirate', robot: 'robot' },
            prompt: function (v, o) { return 'You are a ' + o + '.'; } },
    topic: { label: 'TOPIC', opts: { palm: 'palm trees', ocean: 'the ocean', cars: 'neon cars' },
             prompt: function (v, o) { return 'Write about ' + o + '.'; } },
    format: { label: 'FORMAT', opts: { sentence: 'one sentence', haiku: 'a haiku', bullets: '3 bullet points' },
              prompt: function (v, o) { return 'Format: ' + o + '.'; } },
    style: { label: 'STYLE', opts: { caps: 'ALL CAPS', lower: 'all lowercase' },
             prompt: function (v, o) { return 'Use ' + o + '.'; } }
  };
  var ROLE_LINE = { guide: 'Welcome to Ocean Drive!', pirate: 'Arr, matey!', robot: 'BEEP BOOP. PROCESSING.' };

  function fakeModel(sel) {
    if (!sel.topic) return 'Sure! I can help with that. What would you like me to write about?';
    var t = LIB[sel.topic], out;
    if (!sel.format) {
      out = 'Here is some information about ' + t.label + '. ' + t.sentence + ' There is a lot more to say about ' + t.label +
            ', and people have many different opinions. In conclusion, ' + t.label + ' are a big topic. Let me know if you want more!';
    } else out = t[sel.format];
    if (sel.role) out = ROLE_LINE[sel.role] + '\n' + out;
    if (sel.style === 'caps') out = out.toUpperCase();
    if (sel.style === 'lower') out = out.toLowerCase();
    return out;
  }

  var CHALLENGES = [
    { slots: ['topic', 'format'], answer: { topic: 'ocean', format: 'sentence' },
      goal: 'Make the AI display a one-sentence fact about the ocean.',
      lesson: '<b>Be specific.</b> A vague prompt gets a vague (or rambling) answer. Say the topic <i>and</i> the format you want.' },
    { slots: ['topic', 'format', 'style'], answer: { topic: 'palm', format: 'haiku', style: 'caps' },
      goal: 'Make the AI display exactly the TARGET OUTPUT below.',
      lesson: '<b>Set constraints.</b> Format and style rules ("a haiku", "ALL CAPS") shape the output as much as the topic does.' },
    { slots: ['role', 'topic', 'format', 'style'], answer: { role: 'guide', topic: 'cars', format: 'bullets', style: 'lower' },
      goal: 'Make the AI display exactly the TARGET OUTPUT below.',
      lesson: '<b>Give the AI a role.</b> "You are a tour guide" changes its voice. Role + task + format + constraints is a solid prompt recipe.' }
  ];

  function round3() {
    setStep('ROUND 3/4 · PROMPT');
    var ci = 0;
    function show() {
      var ch = CHALLENGES[ci], sel = {}, tries = 0, solved = false;
      var target = fakeModel(ch.answer);
      app.innerHTML = '';
      var head = el('div', 'card panel intro');
      head.innerHTML =
        '<h2>Round 3: Prompt Lab · ' + (ci + 1) + '/' + CHALLENGES.length + '</h2>' +
        '<p class="lead">A <span class="term">prompt</span> is the instruction you give an AI. The same AI gives very different outputs depending on how you ask.</p>' +
        '<p class="tip">' + ch.goal + ' Pick prompt parts, press RUN, and compare. Leave a part empty to see what happens when you\'re vague.</p>';
      app.appendChild(head);

      var lab = el('div', 'lab');
      var targetCard = el('div', 'card prompt-box');
      targetCard.innerHTML = '<h3 class="pixel pl-h">TARGET OUTPUT</h3>';
      var tgt = el('pre', 'pl-out target-out');
      tgt.textContent = target;
      targetCard.appendChild(tgt);

      var outCard = el('div', 'card prompt-box');
      outCard.innerHTML = '<h3 class="pixel pl-h">AI OUTPUT</h3>';
      var out = el('pre', 'pl-out');
      out.textContent = '(press RUN)';
      outCard.appendChild(out);
      var status = el('div', 'meter-note');
      outCard.appendChild(status);

      var builder = el('div', 'card full prompt-builder');
      builder.innerHTML = '<h3 class="pixel pl-h">BUILD YOUR PROMPT</h3>';
      ch.slots.forEach(function (k) {
        var slot = SLOTS[k];
        var row = el('div', 'pl-row');
        row.appendChild(el('span', 'pixel pl-label', slot.label));
        var opts = [['', '(none)']].concat(Object.keys(slot.opts).map(function (v) { return [v, slot.opts[v]]; }));
        opts.forEach(function (o) {
          var b = el('button', 'chip' + ((sel[k] || '') === o[0] ? ' on' : ''), o[1]);
          b.onclick = function () {
            if (solved) return;
            sel[k] = o[0] || undefined;
            Array.prototype.forEach.call(row.querySelectorAll('.chip'), function (x) { x.classList.remove('on'); });
            b.classList.add('on');
            updatePrompt();
          };
          row.appendChild(b);
        });
        builder.appendChild(row);
      });
      var promptText = el('pre', 'pl-prompt');
      builder.appendChild(promptText);
      var run = el('button', 'btn', 'RUN ▶');
      builder.appendChild(run);

      lab.appendChild(targetCard);
      lab.appendChild(outCard);
      lab.appendChild(builder);
      app.appendChild(lab);
      var insightSlot = el('div');
      app.appendChild(insightSlot);
      var actions = el('div', 'actions');
      app.appendChild(actions);

      function updatePrompt() {
        var parts = ch.slots.filter(function (k) { return sel[k]; }).map(function (k) { return SLOTS[k].prompt(sel[k], SLOTS[k].opts[sel[k]]); });
        promptText.textContent = '> ' + (parts.length ? parts.join(' ') : 'Write something.');
      }
      updatePrompt();

      run.onclick = function () {
        if (solved) return;
        tries++;
        var result = fakeModel(sel);
        out.textContent = result;
        out.classList.remove('flash'); void out.offsetWidth; out.classList.add('flash');
        if (result === target) {
          solved = true;
          out.classList.add('match');
          status.innerHTML = '<span style="color:#39ff88">MATCH! Solved in ' + tries + ' run' + (tries > 1 ? 's' : '') + '.</span>';
          insightSlot.appendChild(el('div', 'card insight', '<h3>Prompt engineered!</h3><p>' + ch.lesson + '</p>'));
          var n = el('button', 'btn', ci + 1 < CHALLENGES.length ? 'NEXT CHALLENGE' : 'NEXT ROUND');
          n.onclick = function () { ci++; if (ci < CHALLENGES.length) show(); else round4(); };
          actions.appendChild(n);
        } else {
          var right = ch.slots.filter(function (k) { return (sel[k] || '') === (ch.answer[k] || ''); }).length;
          status.innerHTML = '<span style="color:var(--pink)">Not a match.</span> ' + right + ' of ' + ch.slots.length + ' prompt parts are right.' +
            (tries >= 3 ? ' <span class="tip">Hint: compare the shape of the text (lines, bullets, capitals) and any greeting at the top.</span>' : '');
        }
      };
    }
    show();
  }

  // ---------- Round 3: quiz ----------
  var QUIZ = [
    {
      q: 'In AI, what is a <span class="term">model</span>?',
      opts: ['A 3D figure of a robot', 'A program that learned patterns from data so it can make predictions', 'A list of every possible answer typed in by hand'],
      a: 1,
      why: 'A <b>model</b> is what you get after training: a program that captures patterns in data and uses them on new inputs.'
    },
    {
      q: 'The DX Lab model looks at a brand-new photo and says "PALM TREE". That output is called a…',
      opts: ['Prediction', 'Training set', 'Label error'],
      a: 0,
      why: 'A <b>prediction</b> is the model\'s answer for new data. The labeled examples it learned from are the <b>training data</b>.'
    },
    {
      q: 'The model gets 6 out of 8 test photos right. What is its <span class="term">accuracy</span>?',
      opts: ['68%', '75%', '80%', '6%'],
      a: 1,
      why: '<b>Accuracy</b> = correct ÷ total = 6 ÷ 8 = 75%. Always measure it on test data the model never trained on.'
    },
    {
      q: 'Every palm photo in training was taken by day, so the model fails on palms at night. This is an example of…',
      opts: ['Bias from unbalanced training data', 'The model being too fast', 'Too much accuracy'],
      a: 0,
      why: '<b>Bias</b>: when training data doesn\'t represent the real world, the model learns unfair or wrong shortcuts.'
    },
    {
      q: 'A model scores 100% on its own training photos but does badly on new photos. This is called…',
      opts: ['Prediction', 'Overfitting', 'Labeling'],
      a: 1,
      why: '<b>Overfitting</b>: the model memorized its training examples instead of learning the general pattern, so it fails on new data.'
    }
  ];

  function round4() {
    setStep('ROUND 4/4 · QUIZ');
    var i = 0, score = 0;
    function show() {
      var item = QUIZ[i];
      app.innerHTML = '';
      var c = el('div', 'card quiz');
      c.appendChild(el('p', 'pixel', 'QUESTION ' + (i + 1) + ' / ' + QUIZ.length + ' &nbsp; · &nbsp; SCORE ' + score));
      c.appendChild(el('div', 'q', item.q));
      var opts = el('div', 'opts');
      var explain = el('div', 'explain');
      var actions = el('div', 'actions');
      item.opts.forEach(function (o, k) {
        var b = el('button', 'opt', o);
        b.onclick = function () {
          var right = k === item.a;
          if (right) score++;
          Array.prototype.forEach.call(opts.children, function (x, j) {
            x.disabled = true;
            if (j === item.a) x.classList.add('right');
          });
          if (!right) b.classList.add('wrong');
          explain.innerHTML = (right ? '<span style="color:#39ff88">Correct!</span> ' : '<span style="color:var(--pink)">Not quite.</span> ') + item.why;
          var n = el('button', 'btn', i + 1 < QUIZ.length ? 'NEXT QUESTION' : 'FINISH LAB');
          n.onclick = function () { i++; if (i < QUIZ.length) show(); else finish(score); };
          actions.appendChild(n);
        };
        opts.appendChild(b);
      });
      c.appendChild(opts);
      c.appendChild(explain);
      c.appendChild(actions);
      app.appendChild(c);
    }
    show();
  }

  // ---------- Win ----------
  function finish(score) {
    setStep('COMPLETE');
    var earned = 0;
    if (AIVice.markComplete(GAME_ID)) {
      AIVice.addTokens(GAME_ID, 50);
      earned = 50;
      if (score === QUIZ.length) { AIVice.addTokens(GAME_ID, 10); earned += 10; }
    }
    refreshTokens();
    app.innerHTML = '';
    var c = el('div', 'card win');
    c.innerHTML =
      '<p class="pixel" style="color:var(--aqua)">DX LAB CLEARED</p>' +
      '<h2 class="neon">AI Fundamentals: Mastered</h2>' +
      '<p>Quiz score: <b style="color:var(--sun)">' + score + ' / ' + QUIZ.length + '</b>' + (score === QUIZ.length ? ' (perfect!)' : '') + '</p>' +
      (earned
        ? '<div class="big-tokens">+' + earned + ' AI TOKENS</div>' + (earned > 50 ? '<p class="tip">Includes a +10 bonus for a perfect quiz.</p>' : '')
        : '<p class="tip">You already collected the DX Lab tokens. Nice practice run!</p>') +
      '<p>You trained a model, measured its accuracy, fixed a biased dataset, and engineered prompts to get exactly the output you wanted. Spend your tokens on a new character at the AI Center.</p>';
    var a = el('div', 'actions');
    var hub = el('button', 'btn', 'Back to AI Center');
    hub.onclick = function () { AIVice.backToHub(); };
    var again = el('button', 'btn ghost', 'LEVEL SELECT');
    again.onclick = intro;
    a.appendChild(hub);
    a.appendChild(again);
    c.appendChild(a);
    app.appendChild(c);
  }

  window.DXLab = {
    GAME_ID: GAME_ID, app: app, photo: photo, drawPhoto: drawPhoto, evaluate: evaluate,
    el: el, refreshTokens: refreshTokens, setStep: setStep, intro: intro
  };
  refreshTokens();
  intro();
})();
