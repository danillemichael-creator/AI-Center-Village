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
  var STATIONS = [
    { n: 1, name: 'Sort Lab', tag: 'PUZZLE', box: [3, 44, 38, 34], label: [6, 37], walk: [33, 80],
      text: 'Sort photos into training data and teach the model what a palm tree is. 3 levels.', go: function () { playLevels(SORT_GAME, 0); } },
    { n: 4, name: 'Data Dash', tag: 'PLATFORMER', box: [40.5, 14, 14.5, 40], label: [41, 7], walk: [47, 60],
      text: 'Run Ocean Drive. Grab correctly labeled photos, skip bad data, stomp glitch bugs.', go: function () { window.DXDash.start(window.DXLab); } },
    { n: 5, name: 'Neural Typer', tag: 'TYPING', box: [57, 38, 22, 31], label: [57, 70], walk: [63, 80],
      text: 'AI words fall like meteors. Type them to blast them and learn what each one means.', go: function () { window.DXTyper.start(window.DXLab); } },
    { n: 2, name: 'Bias Buster', tag: 'DETECTIVE', box: [58, 14.5, 23, 21], label: [60, 29], walk: [68, 74],
      text: 'A model learned the wrong lesson. Find the bias in its data and fix it. 3 levels.', go: function () { playLevels(BIAS_GAME, 0); } },
    { n: 3, name: 'Prompt Lab', tag: 'PROMPTS', box: [87, 22, 13, 46], label: [68, 16], walk: [84, 88],
      text: 'Build prompts that make the AI display exactly the target output. 4 levels.', go: function () { promptLab(0); } }
  ];

  var DONE_KEY = 'dxlab-done';
  function doneGames() { try { return JSON.parse(localStorage.getItem(DONE_KEY)) || {}; } catch (e) { return {}; } }
  function markGame(name) { var d = doneGames(); d[name] = true; try { localStorage.setItem(DONE_KEY, JSON.stringify(d)); } catch (e) {} }

  function intro() {
    setStep('');
    app.innerHTML = '';
    var done = AIVice.isComplete(GAME_ID);
    var room = el('div', 'room');
    room.innerHTML = '<img class="room-art" src="room.webp" alt="The DX Lab at night: a photo-sorting table, an arcade cabinet and a retro computer">' +
      '<div class="chip-tag room-chip"><i></i>DX LAB · AI FUNDAMENTALS</div>' +
      '<div class="chip-tag room-chip right">' + (done ? '★ LAB CLEARED' : 'CLEAR A LEVEL · +50 TOKENS') + '</div>';

    var hero = el('canvas', 'hero');
    hero.width = 168; hero.height = 376;
    var heroPos = [50, 84];
    var ch = AIVice.getActiveCharacter();
    function paintHero(which, i) {
      if (window.AIViceCrew) AIViceCrew.drawInto(hero, ch.id, which, i);
    }
    function placeHero() { hero.style.left = heroPos[0] + '%'; hero.style.top = heroPos[1] + '%'; }
    placeHero(); paintHero('back', 0);

    var dlg = el('div', 'dialog');
    dlg.innerHTML = '<img class="dlg-face" src="dex.webp" alt="">' +
      '<div class="dlg-body"><p class="dlg-who"><b>DEX</b> LAB ASSISTANT</p>' +
      '<p class="dlg-line"></p><p class="dlg-sub"></p></div>';
    var line = dlg.querySelector('.dlg-line'), sub = dlg.querySelector('.dlg-sub');
    function say(a, b) { line.textContent = a; sub.textContent = b; }
    function idle() {
      say('Hey ' + ch.name + '! My AI can\'t tell a palm tree from a pink Cadillac.',
        'Pick a glowing station to teach it something.');
    }
    idle();

    var busy = false;
    STATIONS.forEach(function (d) {
      var b = el('button', 'level station');
      b.setAttribute('aria-label', d.name + ': ' + d.text);
      b.style.left = d.box[0] + '%'; b.style.top = d.box[1] + '%';
      b.style.width = d.box[2] + '%'; b.style.height = d.box[3] + '%';
      var t = el('span', 'chip-tag station-tag');
      t.innerHTML = '<span class="st-n">' + d.n + '</span><span class="lv-name">' + d.name + (doneGames()[d.name] ? ' ★' : '') + '</span><span class="lv-tag">' + d.tag + '</span>';
      t.style.left = d.label[0] + '%'; t.style.top = d.label[1] + '%';
      b.onmouseenter = b.onfocus = function () { say(d.name + ' · ' + d.tag, d.text); };
      b.onmouseleave = b.onblur = idle;
      b.onclick = function () {
        if (busy) return;
        busy = true;
        if (window.DXSfx) window.DXSfx.play('key');
        hero.classList.toggle('flip', d.walk[0] < heroPos[0]);
        heroPos = d.walk; placeHero();
        var f = 0, walker = setInterval(function () { paintHero(f % 2 ? 'front' : 'walk', f); f++; }, 120);
        setTimeout(function () { clearInterval(walker); d.go(); }, 520);
      };
      room.appendChild(b);
      room.appendChild(t);
    });
    room.appendChild(hero);
    room.appendChild(dlg);
    app.appendChild(room);
    var hint = el('p', 'pixel room-hint', '⌘ CLICK A GLOWING STATION TO PLAY');
    app.appendChild(hint);
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

  // ---------- Level runner (Sort Lab + Bias Buster) ----------
  function playLevels(game, i) {
    var cfg = game.levels[i], last = i + 1 === game.levels.length;
    setStep(game.name.toUpperCase() + ' · LEVEL ' + (i + 1) + '/' + game.levels.length);
    var c = {};
    for (var k in cfg) c[k] = cfg[k];
    c.nextLabel = last ? 'FINISH ' + game.name.toUpperCase() : 'NEXT LEVEL';
    c.next = last ? function () { finish(game.name, game.summary); } : function () { playLevels(game, i + 1); };
    trainingLab(c);
  }

  function P(kind, time, mirror) { return photo(kind, time, !!mirror); }
  function L(kind, time, mirror, label) { return { photo: P(kind, time, mirror), label: label }; }

  var SORT_GAME = {
    name: 'Sort Lab',
    summary: 'You built training sets, saw why variety matters, and cleaned up mislabeled data.',
    levels: [
      {
      title: 'Sort Lab · Level 1: Build a training set',
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
    },
      {
        title: 'Sort Lab · Level 2: Night shift',
        text:
          '<p class="lead">The model now has to work around the clock: half the test photos are shot at <b>night</b>.</p>' +
          '<p>If it only ever sees daytime palms, a night-time palm looks like nothing it knows. Give it examples from both.</p>' +
          '<p class="tip">Sort the pile. Reach 85% test accuracy with at least 8 training photos.</p>',
        pool: [P('palm1', 'night'), P('car', 'day'), P('cactus', 'night'), P('palm2', 'day'), P('flamingo', 'night', 1),
               P('palm3', 'night', 1), P('building', 'night'), P('surfboard', 'day'), P('palm2', 'night', 1),
               P('ball', 'night'), P('palm1', 'day', 1), P('cactus', 'day', 1)],
        train: [],
        tests: [P('palm2', 'night'), P('car', 'night', 1), P('palm3', 'day'), P('cactus', 'night', 1),
                P('building', 'day', 1), P('palm1', 'night', 1), P('flamingo', 'day'), P('surfboard', 'night')],
        goal: 0.85, minTrain: 8, showBalance: true, flagWrong: false,
        insight: '<h3>Night shift covered!</h3><p>A model only knows the world its training data shows it. Cover every situation it will meet (day <i>and</i> night) and it stops being surprised.</p>'
      },
      {
        title: 'Sort Lab · Level 3: Label check',
        text:
          '<p class="lead">An intern labeled this training set in a hurry. A few photos are in the <b>wrong bin</b>.</p>' +
          '<p>Wrong labels teach the model wrong answers. Find them and move them to the right bin, or back to the pile.</p>' +
          '<p class="tip">Reach 100% test accuracy with at least 6 training photos.</p>',
        pool: [P('palm3', 'day'), P('ball', 'day')],
        train: [L('palm1', 'day', 0, true), L('car', 'day', 0, true), L('palm2', 'day', 1, true), L('building', 'day', 0, false),
                L('palm3', 'day', 1, false), L('flamingo', 'day', 0, false), L('cactus', 'day', 0, true), L('surfboard', 'day', 0, false)],
        tests: [P('palm1', 'day', 1), P('car', 'day', 1), P('palm2', 'day'), P('cactus', 'day', 1),
                P('palm3', 'day'), P('building', 'day', 1), P('flamingo', 'day', 1), P('surfboard', 'day', 1)],
        goal: 1, minTrain: 6, flagWrong: true,
        insight: '<h3>Labels cleaned!</h3><p>Garbage in, garbage out: a model trusts every label you give it. Real AI teams spend a lot of time checking and fixing labels.</p>'
      }
    ]
  };

  var BIAS_GAME = {
    name: 'Bias Buster',
    summary: 'You found three kinds of bias in training data and fixed each one.',
    levels: [
      {
      title: 'Bias Buster · Level 1: Day and night',
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
    },
      {
        title: 'Bias Buster · Level 2: Lopsided data',
        text:
          '<p class="lead">This model saw <b>six palm trees</b> and only <b>one</b> photo that wasn\'t a palm.</p>' +
          '<p>With so few "not palm" examples, it calls almost everything a palm tree. That\'s <span class="term">class imbalance</span>.</p>' +
          '<p class="tip">Add NOT PALM examples from the pile until the classes are balanced. Reach 100% test accuracy.</p>',
        pool: [P('car', 'day'), P('building', 'night'), P('flamingo', 'day', 1), P('surfboard', 'night'), P('cactus', 'day'),
               P('ball', 'night', 1), P('car', 'night', 1)],
        train: [L('palm1', 'day', 0, true), L('palm2', 'day', 0, true), L('palm3', 'day', 0, true),
                L('palm1', 'night', 1, true), L('palm2', 'night', 1, true), L('palm3', 'night', 1, true), L('ball', 'day', 0, false)],
        tests: [P('car', 'day', 1), P('palm1', 'day', 1), P('building', 'night', 1), P('palm3', 'night'),
                P('flamingo', 'day'), P('cactus', 'day', 1), P('surfboard', 'night', 1), P('palm2', 'day', 1)],
        goal: 1, minTrain: 8, showBalance: true, flagWrong: true,
        insight: '<h3>Balanced!</h3><p>When one answer dominates the training data, a model can score "okay" by always guessing it. Balanced classes force it to learn the real difference.</p>'
      },
      {
        title: 'Bias Buster · Level 3: The lookalike trap',
        text:
          '<p class="lead">This model has never seen a <b>cactus</b> or a <b>flamingo</b>. Green? Must be a palm. Pink and tall? Also a palm.</p>' +
          '<p>The data didn\'t include the tricky lookalikes, so the model learned "green = palm".</p>' +
          '<p class="tip">Add the lookalikes as NOT PALM, plus more palms, so the model learns what really makes a palm. Reach 85% test accuracy with at least 8 training photos.</p>',
        pool: [P('cactus', 'day'), P('cactus', 'night', 1), P('flamingo', 'day'), P('flamingo', 'night', 1),
               P('palm3', 'night'), P('palm2', 'day', 1), P('car', 'day', 1)],
        train: [L('palm1', 'day', 0, true), L('palm2', 'night', 0, true), L('building', 'day', 0, false), L('ball', 'night', 0, false)],
        tests: [P('cactus', 'day', 1), P('palm1', 'night', 1), P('flamingo', 'day', 1), P('palm3', 'day', 1),
                P('cactus', 'night'), P('building', 'night', 1), P('flamingo', 'night'), P('palm2', 'day')],
        goal: 0.85, minTrain: 8, showBalance: true, flagWrong: true,
        insight: '<h3>Trap avoided!</h3><p>Good datasets include <b>hard examples</b>: things that look similar but aren\'t the same. That\'s how a model learns the real features instead of a shortcut.</p>'
      }
    ]
  };

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
      lesson: '<b>Give the AI a role.</b> "You are a tour guide" changes its voice. Role + task + format + constraints is a solid prompt recipe.</p><p class="tip">Prompts can also <b>break</b> an AI. Test that at the Matrix Motel.' }
,
    { slots: ['role', 'topic', 'format', 'style'], answer: { role: 'pirate', topic: 'ocean', format: 'haiku', style: 'caps' },
      goal: 'Final level: make the AI display exactly the TARGET OUTPUT below. Every prompt part matters.',
      lesson: '<b>Put it all together.</b> Role, topic, format and style each change the output. Spell out every one and the AI has nothing left to guess.' }
  ];

  function promptLab(start) {
    var ci = start || 0;
    function show() {
      setStep('PROMPT LAB · LEVEL ' + (ci + 1) + '/' + CHALLENGES.length);
      var ch = CHALLENGES[ci], sel = {}, tries = 0, solved = false;
      var target = fakeModel(ch.answer);
      app.innerHTML = '';
      var head = el('div', 'card panel intro');
      head.innerHTML =
        '<h2>Prompt Lab · Level ' + (ci + 1) + '/' + CHALLENGES.length + '</h2>' +
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
          var n = el('button', 'btn', ci + 1 < CHALLENGES.length ? 'NEXT LEVEL' : 'FINISH PROMPT LAB');
          n.onclick = function () { ci++; if (ci < CHALLENGES.length) show(); else finish('Prompt Lab', 'You used topic, format, constraints and roles to get exactly the output you wanted.'); };
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

  function finish(name, summary) {
    setStep(name.toUpperCase() + ' · CLEARED');
    markGame(name);
    var earned = 0;
    if (AIVice.markComplete(GAME_ID)) {
      AIVice.addTokens(GAME_ID, 50);
      earned = 50;
    }
    refreshTokens();
    if (window.DXSfx) window.DXSfx.play('win');
    app.innerHTML = '';
    var c = el('div', 'card win');
    c.innerHTML =
      '<p class="pixel" style="color:var(--aqua)">' + name.toUpperCase() + ' CLEARED</p>' +
      '<h2 class="neon">All levels done!</h2>' +
      '<p>' + summary + '</p>' +
      (earned
        ? '<div class="big-tokens">+' + earned + ' AI TOKENS</div>'
        : '<p class="tip">You already collected the DX Lab tokens. Try another station for practice!</p>') +
      (name === 'Prompt Lab' ? '<p>Prompts can also be used to <i>break</i> an AI. See how at the Matrix Motel.</p>' : '');
    var a = el('div', 'actions');
    var room = el('button', 'btn', 'BACK TO THE LAB');
    room.onclick = intro;
    var hub = el('button', 'btn ghost', 'Back to AI Center');
    hub.onclick = function () { AIVice.backToHub(); };
    a.appendChild(room);
    a.appendChild(hub);
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
