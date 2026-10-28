// Data Dash: a side-scrolling platformer. The photos you collect become the training set.
(function () {
  var W = 960, H = 480, GROUND = 400, WORLD = 5200, FLAG = 5080;
  var GRAV = 1800, JUMP = 720, SPEED = 270;

  var GROUNDS = [[0, 900], [1000, 1700], [1820, 2600], [2720, 3500], [3600, 4300], [4420, 5200]];
  var PLATFORMS = [[600, 300, 140], [1250, 290, 160], [1450, 220, 120], [2050, 300, 160], [2300, 230, 140],
                   [2900, 300, 120], [3100, 240, 140], [3300, 180, 120], [3800, 290, 160], [4050, 230, 140], [4600, 300, 140]];
  var CHECKPOINTS = [60, 1040, 2760, 4460];
  // tag = the label printed on the photo. A photo is "good data" when its tag matches what it really shows.
  var PICKUPS = [
    [380, 352, 'palm1', 'day', false, 'palm'], [520, 352, 'car', 'day', false, 'palm'],
    [650, 252, 'cactus', 'night', false, 'not'], [1100, 352, 'palm2', 'night', false, 'palm'],
    [1300, 242, 'flamingo', 'day', true, 'not'], [1490, 172, 'palm3', 'day', false, 'not'],
    [1900, 352, 'building', 'night', false, 'not'], [2100, 252, 'palm3', 'night', true, 'palm'],
    [2350, 182, 'cactus', 'day', true, 'palm'], [2800, 352, 'ball', 'day', false, 'not'],
    [3150, 192, 'palm1', 'night', true, 'palm'], [3340, 132, 'surfboard', 'day', false, 'palm'],
    [3700, 352, 'car', 'night', true, 'not'], [3850, 242, 'palm2', 'day', true, 'palm'],
    [4100, 182, 'flamingo', 'night', false, 'palm'], [4520, 352, 'surfboard', 'night', true, 'not'],
    [4650, 252, 'palm3', 'day', true, 'palm'], [4850, 352, 'building', 'day', true, 'not']
  ];
  var BUGS = [[1350, 1100, 1650], [2250, 1880, 2550], [3000, 2760, 3460], [3950, 3640, 4260], [4750, 4460, 5000]];

  function start(api) {
    var app = api.app, el = api.el;
    api.setStep('DATA DASH');
    app.innerHTML = '';
    var tests = [
      api.photo('palm1', 'day', true), api.photo('palm2', 'night', true), api.photo('palm3', 'day', false), api.photo('palm1', 'night', false),
      api.photo('car', 'day', true), api.photo('building', 'night', true), api.photo('flamingo', 'day', false), api.photo('cactus', 'night', true)
    ];
    var ch = (AIVice.getActiveCharacter && AIVice.getActiveCharacter()) || { colors: { body: '#eaf6ff', accent: '#2ee6ff' } };

    var wrap = el('div', 'card dash-wrap');
    var hud = el('div', 'dash-hud pixel');
    var hudPhotos = el('span', '', 'PHOTOS: 0'), hudHint = el('span', '', 'GRAB RIGHT LABELS · SKIP WRONG ONES'), hudBugs = el('span', '', 'BUGS: 0');
    hud.appendChild(hudPhotos); hud.appendChild(hudHint); hud.appendChild(hudBugs);
    var canvas = el('canvas'); canvas.id = 'dash'; canvas.width = W; canvas.height = H;
    var help = el('p', 'dash-help', 'Arrows / WASD to run, Space / W / ↑ to jump. Stomp glitch bugs. Fall or get bugged and you respawn at the last checkpoint. Reach the flag to train your model on everything you grabbed.');
    var touch = el('div', 'touch');
    touch.innerHTML = '<div class="lr"><button data-k="left">◀</button><button data-k="right">▶</button></div><button data-k="jump">▲</button>';
    var actions = el('div', 'actions');
    var quit = el('button', 'btn ghost', 'LEVEL SELECT');
    actions.appendChild(quit);
    wrap.appendChild(hud); wrap.appendChild(canvas); wrap.appendChild(touch); wrap.appendChild(help);
    app.appendChild(wrap); app.appendChild(actions);
    var ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    var pickups = PICKUPS.map(function (d) {
      var p = api.photo(d[2], d[3], d[4]);
      var c = document.createElement('canvas'); api.drawPhoto(c, p);
      return { x: d[0], y: d[1], photo: p, tag: d[5], img: c, taken: false };
    });
    var bugs = BUGS.map(function (b) { return { x: b[0], min: b[1], max: b[2], dir: -1, alive: true, squash: 0 }; });
    var pl = { x: 80, y: GROUND - 32, w: 24, h: 32, vx: 0, vy: 0, onGround: true, face: 1 };
    var cp = 0, haul = [], stomped = 0, hits = 0, camX = 0, toasts = [], flash = 0, running = true, last = 0, t = 0;
    var keys = { left: false, right: false, jump: false }, jumpHeld = false;

    function keyMap(k) {
      if (k === 'ArrowLeft' || k === 'a' || k === 'A') return 'left';
      if (k === 'ArrowRight' || k === 'd' || k === 'D') return 'right';
      if (k === ' ' || k === 'ArrowUp' || k === 'w' || k === 'W') return 'jump';
      return null;
    }
    function down(e) { var k = keyMap(e.key); if (k) { keys[k] = true; e.preventDefault(); } }
    function up(e) { var k = keyMap(e.key); if (k) { keys[k] = false; e.preventDefault(); } }
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    Array.prototype.forEach.call(touch.querySelectorAll('button'), function (b) {
      var k = b.getAttribute('data-k');
      b.addEventListener('pointerdown', function (e) { keys[k] = true; e.preventDefault(); });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) { b.addEventListener(ev, function () { keys[k] = false; }); });
    });
    function stop() {
      running = false;
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    }
    quit.onclick = function () { stop(); api.intro(); };

    function toast(text, x, y, color) { toasts.push({ text: text, x: x, y: y, t: 1.2, color: color }); }
    function respawn() {
      hits++; flash = 0.4;
      pl.x = CHECKPOINTS[cp]; pl.y = GROUND - pl.h; pl.vx = 0; pl.vy = 0;
      toast('GLITCHED! BACK TO CHECKPOINT', pl.x, pl.y - 30, '#ff2fb3');
    }
    function groundAt(x0, x1) {
      for (var i = 0; i < GROUNDS.length; i++) if (x1 > GROUNDS[i][0] && x0 < GROUNDS[i][1]) return true;
      return false;
    }

    function update(dt) {
      t += dt;
      pl.vx = (keys.right ? SPEED : 0) - (keys.left ? SPEED : 0);
      if (pl.vx) pl.face = pl.vx > 0 ? 1 : -1;
      if (keys.jump && !jumpHeld && pl.onGround) { pl.vy = -JUMP; pl.onGround = false; }
      jumpHeld = keys.jump;
      if (!keys.jump && pl.vy < -260) pl.vy = -260; // short hop when released early
      pl.vy += GRAV * dt;
      var prevBottom = pl.y + pl.h;
      pl.x = Math.max(0, Math.min(WORLD - pl.w, pl.x + pl.vx * dt));
      pl.y += pl.vy * dt;
      pl.onGround = false;
      var bottom = pl.y + pl.h;
      if (pl.vy >= 0) {
        if (prevBottom <= GROUND + 1 && bottom >= GROUND && groundAt(pl.x + 4, pl.x + pl.w - 4)) { pl.y = GROUND - pl.h; pl.vy = 0; pl.onGround = true; }
        PLATFORMS.forEach(function (p) {
          if (prevBottom <= p[1] + 1 && bottom >= p[1] && pl.x + pl.w > p[0] && pl.x < p[0] + p[2]) { pl.y = p[1] - pl.h; pl.vy = 0; pl.onGround = true; }
        });
      }
      if (pl.y > H + 40) { respawn(); return; }
      for (var i = CHECKPOINTS.length - 1; i > cp; i--) if (pl.x >= CHECKPOINTS[i]) { cp = i; toast('CHECKPOINT', CHECKPOINTS[i], GROUND - 90, '#2ee6ff'); break; }

      pickups.forEach(function (p) {
        if (p.taken) return;
        if (pl.x + pl.w > p.x && pl.x < p.x + 40 && pl.y + pl.h > p.y && pl.y < p.y + 48) {
          p.taken = true; haul.push(p);
          toast('+1 ' + (p.tag === 'palm' ? 'PALM' : 'NOT PALM'), p.x, p.y - 10, '#ffd23f');
        }
      });
      bugs.forEach(function (b) {
        if (!b.alive) { b.squash -= dt; return; }
        b.x += b.dir * 80 * dt;
        if (b.x < b.min) { b.x = b.min; b.dir = 1; }
        if (b.x > b.max - 28) { b.x = b.max - 28; b.dir = -1; }
        var by = GROUND - 22;
        if (pl.x + pl.w > b.x && pl.x < b.x + 28 && pl.y + pl.h > by && pl.y < by + 22) {
          if (pl.vy > 0 && prevBottom <= by + 12) {
            b.alive = false; b.squash = 0.5; stomped++; pl.vy = -480;
            toast('BUG SQUASHED', b.x, by - 20, '#39ff88');
          } else respawn();
        }
      });
      toasts.forEach(function (o) { o.t -= dt; o.y -= 30 * dt; });
      toasts = toasts.filter(function (o) { return o.t > 0; });
      flash = Math.max(0, flash - dt);
      camX = Math.max(0, Math.min(WORLD - W, pl.x - W * 0.35));
      hudPhotos.textContent = 'PHOTOS: ' + haul.length;
      hudBugs.textContent = 'BUGS: ' + stomped;
      if (pl.x >= FLAG) { stop(); setTimeout(results, 350); }
    }

    function draw() {
      var g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#0a0518'); g.addColorStop(0.55, '#2b1140'); g.addColorStop(0.8, '#ff2fb3'); g.addColorStop(1, '#ff7a3d');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      // striped synthwave sun (slow parallax)
      var sx = 620 - camX * 0.05, sy = 250;
      ctx.save(); ctx.beginPath(); ctx.arc(sx, sy, 110, Math.PI, 0); ctx.closePath(); ctx.clip();
      var sg = ctx.createLinearGradient(0, sy - 110, 0, sy); sg.addColorStop(0, '#ffd23f'); sg.addColorStop(1, '#ff2fb3');
      ctx.fillStyle = sg; ctx.fillRect(sx - 110, sy - 110, 220, 110);
      ctx.fillStyle = '#2b1140';
      for (var s = 0; s < 6; s++) ctx.fillRect(sx - 110, sy - 50 + s * 9, 220, 2 + s);
      ctx.restore();
      // distant palm silhouettes
      ctx.fillStyle = '#1a0a2a';
      for (var px = -((camX * 0.3) % 240); px < W; px += 240) {
        ctx.fillRect(px + 40, 260, 6, 140);
        for (var f = -2; f <= 2; f++) { ctx.beginPath(); ctx.ellipse(px + 43 + f * 14, 258 + Math.abs(f) * 6, 22, 6, f * 0.4, 0, Math.PI * 2); ctx.fill(); }
      }
      ctx.save(); ctx.translate(-Math.round(camX), 0);
      // ground with neon grid
      GROUNDS.forEach(function (gr) {
        ctx.fillStyle = '#12061f'; ctx.fillRect(gr[0], GROUND, gr[1] - gr[0], H - GROUND);
        ctx.fillStyle = '#ff2fb3'; ctx.fillRect(gr[0], GROUND, gr[1] - gr[0], 3);
        ctx.fillStyle = 'rgba(46,230,255,0.35)';
        for (var x = gr[0] - (gr[0] % 40) + 40; x < gr[1]; x += 40) ctx.fillRect(x, GROUND + 3, 1, H - GROUND);
        for (var y = GROUND + 20; y < H; y += 20) ctx.fillRect(gr[0], y, gr[1] - gr[0], 1);
      });
      PLATFORMS.forEach(function (p) {
        ctx.fillStyle = '#2b1140'; ctx.fillRect(p[0], p[1], p[2], 14);
        ctx.fillStyle = '#2ee6ff'; ctx.fillRect(p[0], p[1], p[2], 3);
      });
      // intro signs (teach by layout, like World 1-1)
      ctx.font = '22px VT323, monospace'; ctx.textAlign = 'center';
      ctx.fillStyle = '#2ee6ff'; ctx.fillText('Labels can be WRONG. Grab only photos', 450, 230); ctx.fillText('whose label matches the picture.', 450, 254);
      ctx.fillStyle = '#ffd23f'; ctx.fillText('Bad data = a confused model', 450, 290);
      CHECKPOINTS.slice(1).forEach(function (c, i) {
        ctx.fillStyle = i + 1 <= cp ? '#39ff88' : '#555'; ctx.fillRect(c, GROUND - 60, 4, 60);
        ctx.fillRect(c + 4, GROUND - 60, 18, 12);
      });
      // finish flag
      ctx.fillStyle = '#eaf6ff'; ctx.fillRect(FLAG, GROUND - 160, 5, 160);
      ctx.fillStyle = '#ffd23f'; ctx.fillRect(FLAG + 5, GROUND - 160, 50, 30);
      ctx.fillStyle = '#0a0518'; ctx.font = '16px "Press Start 2P", monospace'; ctx.fillText('AI', FLAG + 30, GROUND - 138);
      ctx.fillStyle = '#ffd23f'; ctx.font = '20px VT323, monospace'; ctx.fillText('TRAIN MODEL', FLAG + 20, GROUND - 170);
      // photo pickups
      pickups.forEach(function (p, i) {
        if (p.taken) return;
        var by = p.y + Math.sin(t * 3 + i) * 4;
        ctx.fillStyle = '#eaf6ff'; ctx.fillRect(p.x - 2, by - 2, 44, 58);
        ctx.drawImage(p.img, p.x, by, 40, 40);
        ctx.fillStyle = p.tag === 'palm' ? '#39ff88' : '#ff2fb3'; ctx.fillRect(p.x - 2, by + 40, 44, 16);
        ctx.fillStyle = '#0a0518'; ctx.font = '14px VT323, monospace';
        ctx.fillText(p.tag === 'palm' ? 'PALM' : 'NOT PALM', p.x + 20, by + 53);
      });
      // glitch bugs
      bugs.forEach(function (b) {
        var by = GROUND - 22;
        if (!b.alive) { if (b.squash > 0) { ctx.fillStyle = '#39ff88'; ctx.fillRect(b.x, GROUND - 6, 28, 6); } return; }
        var jitter = Math.sin(t * 20 + b.x) > 0.6 ? 2 : 0;
        ctx.fillStyle = '#ff2fb3'; ctx.fillRect(b.x + jitter, by, 28, 18);
        ctx.fillStyle = '#2ee6ff'; ctx.fillRect(b.x + 3 - jitter, by + 4, 22, 3);
        ctx.fillStyle = '#0a0518'; ctx.fillRect(b.x + (b.dir > 0 ? 18 : 4), by + 9, 6, 5);
        ctx.fillStyle = '#ff2fb3'; ctx.fillRect(b.x + 2, by + 18, 4, 4); ctx.fillRect(b.x + 22, by + 18, 4, 4);
      });
      // player in the equipped character's colors
      var c = ch.colors;
      ctx.fillStyle = c.body; ctx.fillRect(pl.x, pl.y + 8, pl.w, pl.h - 14);
      ctx.fillStyle = c.accent; ctx.fillRect(pl.x, pl.y, pl.w, 10); ctx.fillRect(pl.x, pl.y + 18, pl.w, 4);
      ctx.fillStyle = '#0a0518'; ctx.fillRect(pl.x + (pl.face > 0 ? 15 : 4), pl.y + 11, 4, 4);
      var step = pl.onGround && pl.vx ? (Math.floor(t * 10) % 2) * 4 : 0;
      ctx.fillStyle = c.accent; ctx.fillRect(pl.x + 2, pl.y + pl.h - 6, 8, 6 - step / 2); ctx.fillRect(pl.x + 14, pl.y + pl.h - 6 + step / 2, 8, 6 - step / 2);
      toasts.forEach(function (o) {
        ctx.globalAlpha = Math.min(1, o.t * 2); ctx.fillStyle = o.color; ctx.font = '22px VT323, monospace'; ctx.fillText(o.text, o.x + 20, o.y);
      });
      ctx.globalAlpha = 1;
      ctx.restore();
      if (flash) { ctx.fillStyle = 'rgba(255,47,179,' + flash + ')'; ctx.fillRect(0, 0, W, H); }
    }

    function frame(ts) {
      if (!running) return;
      var dt = last ? Math.min(0.033, (ts - last) / 1000) : 0.016;
      last = ts;
      update(dt);
      if (running) draw();
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    function results() {
      api.setStep('DATA DASH · RESULTS');
      app.innerHTML = '';
      var train = haul.map(function (p) { return { photo: p.photo, label: p.tag === 'palm' }; });
      var bad = haul.filter(function (p) { return (p.tag === 'palm') !== p.photo.palm; }).length;
      var res = api.evaluate(train, tests);
      var pct = Math.round(res.acc * 100);
      var pass = haul.length >= 4 && res.acc >= 0.85;
      var c = el('div', 'card panel intro');
      c.innerHTML = '<h2>' + (pass ? 'Model trained!' : 'Your model is confused') + '</h2>' +
        '<p class="lead">You grabbed <b>' + haul.length + '</b> photos: <b style="color:#39ff88">' + (haul.length - bad) + ' correctly labeled</b> and <b style="color:var(--pink)">' + bad + ' mislabeled</b>. ' +
        'They became the <span class="term">training data</span>. On 8 photos it had never seen, the model scored <b style="color:var(--sun)">' + pct + '%</b> accuracy (goal: 85%).</p>';
      var h = el('div', 'haul');
      haul.forEach(function (p) {
        var ok = (p.tag === 'palm') === p.photo.palm;
        var d = el('div', 'test ' + (ok ? 'ok' : 'bad'));
        var cv = document.createElement('canvas'); api.drawPhoto(cv, p.photo); d.appendChild(cv);
        d.appendChild(el('div', 'guess', (p.tag === 'palm' ? 'PALM' : 'NOT PALM') + (ok ? ' ✓' : ' ✗')));
        h.appendChild(d);
      });
      c.appendChild(h);
      var tr = el('div', 'tests');
      tests.forEach(function (p, i) {
        var g = res.preds[i], ok = g === p.palm;
        var d = el('div', 'test ' + (ok ? 'ok' : 'bad'));
        var cv = document.createElement('canvas'); api.drawPhoto(cv, p); d.appendChild(cv);
        d.appendChild(el('div', 'guess', g === null ? '?' : (g ? 'palm' : 'not palm')));
        tr.appendChild(d);
      });
      c.appendChild(el('p', 'tip', 'Test photos (green = model got it right):'));
      c.appendChild(tr);
      c.appendChild(el('div', 'card insight', pass
        ? '<h3>Garbage in, garbage out</h3><p>A model is only as good as its data. ' + (bad ? 'Your ' + bad + ' mislabeled photo' + (bad > 1 ? 's' : '') + ' still taught it some wrong lessons. ' : 'You skipped every bad label: clean data! ') + 'Real AI teams spend a lot of time <b>cleaning labels</b> before training.</p>'
        : '<h3>Garbage in, garbage out</h3><p>' + (haul.length < 4 ? 'Too little data: grab at least 4 photos. ' : '') + (bad ? bad + ' mislabeled photo' + (bad > 1 ? 's' : '') + ' taught the model the wrong thing. ' : '') + 'Try again, and only grab photos whose label matches the picture.</p>'));
      app.appendChild(c);
      var a = el('div', 'actions');
      if (pass) {
        var earned = AIVice.markComplete(api.GAME_ID);
        if (earned) AIVice.addTokens(api.GAME_ID, 50);
        api.refreshTokens();
        c.insertBefore(el('div', 'big-tokens', earned ? '+50 AI TOKENS' : 'DX LAB ALREADY CLEARED'), c.children[1]);
        var hub = el('button', 'btn', 'Back to AI Center');
        hub.onclick = function () { AIVice.backToHub(); };
        a.appendChild(hub);
      }
      var again = el('button', 'btn' + (pass ? ' ghost' : ''), 'RUN IT AGAIN');
      again.onclick = function () { start(api); };
      var sel = el('button', 'btn ghost', 'LEVEL SELECT');
      sel.onclick = api.intro;
      a.appendChild(again); a.appendChild(sel);
      app.appendChild(a);
    }
    // test hook
    window.DXDash.state = function () { return { pl: pl, haul: haul.length, cp: cp, running: running, pickups: pickups, bugs: bugs, hits: hits }; };
    window.DXDash.keys = keys;
  }

  window.DXDash = { start: start };
})();
