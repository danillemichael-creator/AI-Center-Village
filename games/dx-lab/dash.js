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
    var hudMute = el('span', '', '');
    hudMute.setAttribute('role', 'button'); hudMute.setAttribute('tabindex', '0'); hudMute.setAttribute('aria-label', 'Toggle sound');
    hudMute.style.cursor = 'pointer';
    function updateMute() { hudMute.textContent = window.DXSfx && window.DXSfx.muted() ? '♪ OFF' : '♪ ON'; }
    function toggleMute(e) {
      if (e) e.preventDefault();
      if (window.DXSfx) window.DXSfx.toggle();
      updateMute();
    }
    hudMute.addEventListener('click', toggleMute);
    hudMute.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') toggleMute(e); });
    hud.appendChild(hudPhotos); hud.appendChild(hudHint); hud.appendChild(hudBugs); hud.appendChild(hudMute);
    updateMute();
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
    var pl = { x: 80, y: GROUND - 32, w: 24, h: 32, vx: 0, vy: 0, onGround: true, face: 1, squash: 0, invuln: 0 };
    var cp = 0, haul = [], stomped = 0, hits = 0, camX = 0, toasts = [], particles = [], shake = 0, flash = 0, running = true, last = 0, t = 0;
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
    function burst(x, y, n, colors, speed) {
      for (var i = 0; i < n; i++) {
        var a = Math.random() * Math.PI * 2, v = speed * (0.4 + Math.random() * 0.6);
        particles.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - speed * 0.3, life: 0.5 + Math.random() * 0.4, color: colors[i % colors.length], size: 2 + (i % 3) * 2 });
      }
    }
    function respawn() {
      hits++; flash = 0.4; shake = 0.25; burst(pl.x + 12, pl.y + 16, 16, ['#ff2fb3', '#2ee6ff', '#eaf6ff'], 260);
      if (window.DXSfx) window.DXSfx.play('hurt');
      pl.x = CHECKPOINTS[cp]; pl.y = GROUND - pl.h; pl.vx = 0; pl.vy = 0; pl.invuln = 1;
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
      if (keys.jump && !jumpHeld && pl.onGround) { pl.vy = -JUMP; pl.onGround = false; if (window.DXSfx) window.DXSfx.play('jump'); }
      jumpHeld = keys.jump;
      if (!keys.jump && pl.vy < -260) pl.vy = -260; // short hop when released early
      pl.vy += GRAV * dt;
      var prevBottom = pl.y + pl.h, wasGround = pl.onGround;
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
      if (pl.onGround && !wasGround) { pl.squash = 0.15; burst(pl.x + 12, pl.y + pl.h, 5, ['#eaf6ff', '#ff8ad8'], 90); }
      if (pl.onGround && pl.vx && Math.random() < 0.15) particles.push({ x: pl.x + (pl.face > 0 ? 2 : 20), y: pl.y + pl.h - 3, vx: -pl.face * 30, vy: -20, life: 0.3, color: '#ff8ad8', size: 3 });
      pl.squash = Math.max(0, pl.squash - dt); pl.invuln = Math.max(0, pl.invuln - dt); shake = Math.max(0, shake - dt);
      particles.forEach(function (q) { q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 600 * dt; q.life -= dt; });
      particles = particles.filter(function (q) { return q.life > 0; });
      if (pl.y > H + 40) { respawn(); return; }
      for (var i = CHECKPOINTS.length - 1; i > cp; i--) if (pl.x >= CHECKPOINTS[i]) { cp = i; toast('CHECKPOINT', CHECKPOINTS[i], GROUND - 90, '#2ee6ff'); if (window.DXSfx) window.DXSfx.play('checkpoint'); break; }

      pickups.forEach(function (p) {
        if (p.taken) return;
        if (pl.x + pl.w > p.x && pl.x < p.x + 40 && pl.y + pl.h > p.y && pl.y < p.y + 48) {
          p.taken = true; haul.push(p); burst(p.x + 20, p.y + 24, 14, ['#ffd23f', '#eaf6ff', '#39ff88'], 220); if (window.DXSfx) window.DXSfx.play('coin');
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
            b.alive = false; b.squash = 0.5; stomped++; pl.vy = -480; shake = 0.15; burst(b.x + 14, by + 10, 14, ['#ff2fb3', '#2ee6ff', '#39ff88'], 240); if (window.DXSfx) window.DXSfx.play('stomp');
            toast('BUG SQUASHED', b.x, by - 20, '#39ff88');
          } else if (!pl.invuln) respawn();
        }
      });
      toasts.forEach(function (o) { o.t -= dt; o.y -= 30 * dt; });
      toasts = toasts.filter(function (o) { return o.t > 0; });
      flash = Math.max(0, flash - dt);
      camX = Math.max(0, Math.min(WORLD - W, pl.x - W * 0.35));
      hudPhotos.textContent = 'PHOTOS: ' + haul.length;
      hudBugs.textContent = 'BUGS: ' + stomped;
      if (pl.x >= FLAG) { if (window.DXSfx) window.DXSfx.play('goal'); stop(); setTimeout(results, 350); }
    }

    // ---------- pixel art (Super Mario World-style: outlined, shaded, layered parallax) ----------
    var OUT = '#0a0518';
    function spr(rows, pal, x, y, s, flip) {
      for (var r = 0; r < rows.length; r++) {
        var row = rows[r];
        for (var c = 0; c < row.length; c++) {
          var col = pal[row[c]];
          if (!col) continue;
          ctx.fillStyle = col;
          ctx.fillRect(x + (flip ? row.length - 1 - c : c) * s, y + r * s, s, s);
        }
      }
    }
    function layer(w, h, paint) {
      var c = document.createElement('canvas'); c.width = w; c.height = h;
      var g = c.getContext('2d'); g.imageSmoothingEnabled = false; paint(g); return c;
    }
    function shade(hex, f) {
      var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
      function k(v) { return Math.max(0, Math.min(255, Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f))); }
      return 'rgb(' + k(r) + ',' + k(g) + ',' + k(b) + ')';
    }
    var STARS = [];
    for (var si = 0; si < 70; si++) { var hx = Math.sin(si * 12.9898) * 43758.5453, hy = Math.sin(si * 78.233) * 12543.1; STARS.push([Math.floor((hx - Math.floor(hx)) * W), Math.floor((hy - Math.floor(hy)) * 210), si % 3]); }
    var skyline = layer(960, 220, function (g) {
      var xs = [0, 70, 130, 230, 300, 390, 470, 560, 630, 720, 800, 880];
      xs.forEach(function (x, i) {
        var w = 50 + (i * 23) % 40, h = 70 + (i * 47) % 120, top = 220 - h;
        g.fillStyle = '#1b0b33'; g.fillRect(x, top, w, h);
        g.fillStyle = '#26124a'; g.fillRect(x, top, 4, h);
        if (i % 3 === 0) { g.fillStyle = '#1b0b33'; g.fillRect(x + w / 2 - 6, top - 18, 12, 18); g.fillRect(x + w / 2 - 1, top - 30, 2, 12); }
        if (i % 3 === 1) { g.fillStyle = '#ff2fb3'; g.fillRect(x + 4, top + 8, w - 8, 3); }
        for (var wy = top + 18; wy < 214; wy += 12)
          for (var wx = x + 8; wx < x + w - 8; wx += 10)
            if ((wx * 7 + wy * 3 + i) % 5 < 2) { g.fillStyle = (wx + wy) % 3 ? '#ffd23f' : '#2ee6ff'; g.fillRect(wx, wy, 4, 5); }
      });
    });
    var hills = layer(960, 170, function (g) {
      [[120, 150, 130], [430, 200, 165], [760, 160, 120]].forEach(function (hl) {
        var cx = hl[0], rw = hl[1], rh = hl[2];
        for (var y = 0; y < rh; y += 4) {
          var half = Math.round(rw * Math.sqrt(1 - Math.pow(1 - y / rh, 2)) / 4) * 4;
          var top = 170 - rh + y;
          g.fillStyle = OUT; g.fillRect(cx - half - 4, top, half * 2 + 8, 4);
          g.fillStyle = '#0e2436'; g.fillRect(cx - half, top + (y === 0 ? 4 : 0), half * 2, 4);
          g.fillStyle = '#143247'; g.fillRect(cx - half, top, Math.max(0, half - 6), 4);
          if (y % 24 === 12) { g.fillStyle = 'rgba(46,230,255,0.45)'; for (var d = cx - half + 12; d < cx + half - 8; d += 28) g.fillRect(d + (y % 32 ? 14 : 0), top, 4, 4); }
        }
      });
    });
    var palmSprite = layer(96, 170, function (g) {
      for (var y = 40; y < 170; y += 6) {
        var bend = Math.round(Math.sin(y / 40) * 6);
        g.fillStyle = OUT; g.fillRect(44 + bend, y, 12, 6);
        g.fillStyle = '#5a2f2a'; g.fillRect(46 + bend, y, 8, 5);
        g.fillStyle = '#8a4a34'; g.fillRect(46 + bend, y, 3, 5);
      }
      var fr = [[-1, 0], [1, 0], [-1, 1], [1, 1], [-1, -1], [1, -1]];
      fr.forEach(function (f) {
        for (var i = 0; i < 9; i++) {
          var x = 50 + f[0] * i * 5, y = 40 + f[1] * i * 2 + Math.round(i * i * 0.18);
          g.fillStyle = OUT; g.fillRect(x - 3, y - 3, 8, 8);
        }
        for (var j = 0; j < 9; j++) {
          var x2 = 50 + f[0] * j * 5, y2 = 40 + f[1] * j * 2 + Math.round(j * j * 0.18);
          g.fillStyle = j % 2 ? '#1fbf6a' : '#39ff88'; g.fillRect(x2 - 2, y2 - 2, 6, 5);
        }
      });
      g.fillStyle = OUT; g.fillRect(42, 36, 16, 12);
      g.fillStyle = '#ffd23f'; g.fillRect(44, 38, 5, 5); g.fillRect(51, 40, 5, 5);
    });
    var groundTile = layer(40, 80, function (g) {
      g.fillStyle = '#2b1140'; g.fillRect(0, 0, 40, 80);
      for (var y = 14; y < 80; y += 4) for (var x = 0; x < 40; x += 4) if (((x + y) / 4) % 2 === 0) { g.fillStyle = '#331650'; g.fillRect(x, y, 4, 4); }
      g.fillStyle = '#1f0c34'; g.fillRect(6, 30, 8, 6); g.fillRect(24, 54, 10, 6);
      g.fillStyle = '#4a2370'; g.fillRect(6, 30, 8, 2); g.fillRect(24, 54, 10, 2);
      g.fillStyle = OUT; g.fillRect(0, 0, 40, 3);
      g.fillStyle = '#ff2fb3'; g.fillRect(0, 3, 40, 8);
      g.fillStyle = '#ff8ad8'; g.fillRect(0, 3, 40, 3);
      g.fillStyle = '#b3127c'; for (var b = 0; b < 40; b += 8) g.fillRect(b + 2, 11, 4, 4);
      g.fillStyle = OUT; g.fillRect(0, 11, 40, 1);
    });
    var brick = layer(20, 20, function (g) {
      g.fillStyle = OUT; g.fillRect(0, 0, 20, 20);
      g.fillStyle = '#3d1a63'; g.fillRect(1, 1, 18, 18);
      g.fillStyle = '#5a2a8c'; g.fillRect(1, 1, 18, 3); g.fillRect(1, 1, 3, 18);
      g.fillStyle = '#26104a'; g.fillRect(1, 16, 18, 3); g.fillRect(16, 1, 3, 18);
      g.fillStyle = '#2ee6ff'; g.fillRect(1, 1, 18, 2);
      g.fillStyle = '#eaf6ff'; g.fillRect(4, 6, 2, 2);
    });
    var c0 = ch.colors, body = c0.body, acc = c0.accent;
    var PAL = { o: OUT, a: acc, A: shade(acc, -0.35), b: body, B: shade(body, -0.3), s: '#ffcf9e', S: '#d9926a', k: '#0a0518', h: '#2ee6ff', p: '#2b1140', w: '#eaf6ff' };
    var HEAD = [
      '...oooooo...',
      '..oaaaaaao..',
      '.oaaaaaaaaoo',
      '.oAAAAAAAAAo',
      '.osssssssso.',
      '.osskkkkkko.',
      '.ossskhkkho.',
      '..osssSsso..',
      '..oobbbboo..',
      '.obbbaabbbo.',
      'osbbbaabbbso',
      'osBbbaabbBso',
      '.oBBBaaBBBo.'
    ];
    var LEGS = {
      idle: ['..oppooppo..', '..oppooppo..', '.owwoo.owwo.'],
      run1: ['.oppo..oppo.', 'oppo....opo.', 'owwo....oww.'],
      run2: ['...opppo....', '...oppppo...', '..owwwwwo...'],
      jump: ['.opppoopppo.', 'opo......opo', 'ow........wo']
    };
    var BUG = [
      '....oooooo....',
      '..oommmmmmoo..',
      '.ommmmccmmmmo.',
      'ommmmccccmmmmo',
      'ommwkmmmmwkmmo',
      'ommwkmmmmwkmmo',
      'oMmmmmmmmmmmMo',
      '.occcccccccco.'
    ];
    var BUGLEGS = [['..oo.o..o.oo..', '.o..........o.'], ['.o..o....o..o.', '..o........o..']];
    var BPAL = { o: OUT, m: '#ff2fb3', M: '#b3127c', c: '#2ee6ff', w: '#eaf6ff', k: OUT };
    var BPAL_GLITCH = { o: 'rgba(46,230,255,0.6)', m: 'rgba(46,230,255,0.6)', M: 'rgba(46,230,255,0.6)', c: 'rgba(46,230,255,0.6)', w: 'rgba(46,230,255,0.6)', k: 'rgba(46,230,255,0.6)' };

    function outlinedText(text, x, y, color, font) {
      ctx.font = font || '22px VT323, monospace';
      ctx.lineWidth = 4; ctx.strokeStyle = OUT; ctx.strokeText(text, x, y);
      ctx.fillStyle = color; ctx.fillText(text, x, y);
    }

    function drawPlayer() {
      var pose = !pl.onGround ? 'jump' : pl.vx ? (Math.floor(t * 12) % 2 ? 'run1' : 'run2') : 'idle';
      var sq = pl.squash > 0 ? pl.squash / 0.15 : 0;
      var sx = 1 + 0.18 * sq, sy = 1 - 0.18 * sq;
      if (!pl.onGround) { sx = 0.92; sy = 1.08; }
      var blink = pl.invuln > 0 && Math.floor(t * 20) % 2;
      if (blink) return;
      ctx.save();
      ctx.translate(pl.x + pl.w / 2, pl.y + pl.h);
      ctx.scale(sx, sy);
      ctx.fillStyle = 'rgba(10,5,24,0.35)';
      if (pl.onGround) ctx.fillRect(-12, -2, 24, 4);
      var bob = pose === 'run2' ? -2 : 0;
      spr(HEAD, PAL, -12, -32 + bob, 2, pl.face < 0);
      spr(LEGS[pose], PAL, -12, -6, 2, pl.face < 0);
      ctx.restore();
    }

    function drawBug(b) {
      var by = GROUND - 22;
      if (!b.alive) {
        if (b.squash > 0) {
          ctx.globalAlpha = Math.min(1, b.squash * 2);
          spr([BUG[0], BUG[3], BUG[7]], BPAL, b.x, GROUND - 6, 2, false);
          ctx.globalAlpha = 1;
        }
        return;
      }
      var fr = Math.floor(t * 8 + b.x) % 2;
      var hop = fr ? 0 : -1;
      if (Math.sin(t * 13 + b.x) > 0.85) spr(BUG, BPAL_GLITCH, b.x + 3, by + 2 + hop, 2, b.dir > 0);
      spr(BUG, BPAL, b.x, by + 2 + hop, 2, b.dir > 0);
      spr(BUGLEGS[fr], BPAL, b.x, by + 18 + hop, 2, false);
    }

    function drawCard(p, i) {
      var by = p.y + Math.round(Math.sin(t * 3 + i) * 4);
      var spin = 0.82 + 0.18 * Math.abs(Math.cos(t * 1.6 + i));
      ctx.save();
      ctx.translate(p.x + 20, by);
      ctx.scale(spin, 1);
      var glow = 0.35 + 0.25 * Math.sin(t * 4 + i);
      ctx.fillStyle = 'rgba(255,210,63,' + glow + ')'; ctx.fillRect(-27, -7, 54, 68);
      ctx.fillStyle = OUT; ctx.fillRect(-25, -5, 50, 64);
      ctx.fillStyle = '#eaf6ff'; ctx.fillRect(-23, -3, 46, 60);
      ctx.fillStyle = '#b9c6e6'; ctx.fillRect(-23, 53, 46, 4);
      ctx.drawImage(p.img, -20, 0, 40, 40);
      ctx.fillStyle = OUT; ctx.fillRect(-21, 40, 42, 14);
      ctx.fillStyle = p.tag === 'palm' ? '#39ff88' : '#ff2fb3'; ctx.fillRect(-20, 41, 40, 12);
      ctx.fillStyle = OUT; ctx.font = '12px VT323, monospace'; ctx.textAlign = 'center';
      ctx.fillText(p.tag === 'palm' ? 'PALM' : 'NOT PALM', 0, 51);
      ctx.restore();
      var gl = (t * 0.7 + i * 0.37) % 2;
      if (gl < 0.25) {
        var gx = p.x + 38, gy = by - 2, r = 2 + gl * 16;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(gx - 1, gy - r, 2, r * 2); ctx.fillRect(gx - r, gy - 1, r * 2, 2);
      }
    }

    function drawGround() {
      GROUNDS.forEach(function (gr) {
        for (var x = gr[0]; x < gr[1]; x += 40) {
          if (x + 40 < camX - 40 || x > camX + W + 40) continue;
          var w = Math.min(40, gr[1] - x);
          ctx.drawImage(groundTile, 0, 0, w, 80, x, GROUND, w, 80);
        }
        ctx.fillStyle = OUT; ctx.fillRect(gr[0] - 3, GROUND, 3, 80); ctx.fillRect(gr[1], GROUND, 3, 80);
        ctx.fillStyle = '#ff8ad8'; ctx.fillRect(gr[0], GROUND + 3, 3, 77);
      });
      // glowing pits
      for (var i = 0; i < GROUNDS.length - 1; i++) {
        var a = GROUNDS[i][1] + 3, b = GROUNDS[i + 1][0] - 3;
        var pg = ctx.createLinearGradient(0, GROUND + 20, 0, H);
        pg.addColorStop(0, 'rgba(255,122,61,0)'); pg.addColorStop(1, 'rgba(255,122,61,0.55)');
        ctx.fillStyle = pg; ctx.fillRect(a, GROUND + 20, b - a, H - GROUND - 20);
      }
    }

    function drawPlatforms() {
      PLATFORMS.forEach(function (p) {
        for (var x = p[0]; x < p[0] + p[2]; x += 20) ctx.drawImage(brick, x, p[1]);
        ctx.fillStyle = 'rgba(10,5,24,0.35)'; ctx.fillRect(p[0] + 4, p[1] + 20, p[2] - 4, 4);
      });
    }

    function drawSign() {
      var x = 150, y = 196, w = 400, h = 112;
      ctx.fillStyle = OUT; ctx.fillRect(x + 40, y + h, 10, GROUND - y - h); ctx.fillRect(x + w - 50, y + h, 10, GROUND - y - h);
      ctx.fillStyle = '#5a2f2a'; ctx.fillRect(x + 42, y + h, 6, GROUND - y - h); ctx.fillRect(x + w - 48, y + h, 6, GROUND - y - h);
      ctx.fillStyle = OUT; ctx.fillRect(x - 4, y - 4, w + 8, h + 8);
      ctx.fillStyle = '#2b1140'; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#ffd23f'; ctx.fillRect(x, y, w, 3); ctx.fillRect(x, y + h - 3, w, 3); ctx.fillRect(x, y, 3, h); ctx.fillRect(x + w - 3, y, 3, h);
      ctx.textAlign = 'center';
      outlinedText('Labels can be WRONG. Grab only photos', x + w / 2, y + 32, '#2ee6ff');
      outlinedText('whose label matches the picture.', x + w / 2, y + 56, '#2ee6ff');
      outlinedText('Bad data = a confused model', x + w / 2, y + 90, '#ffd23f');
    }

    function drawCheckpoints() {
      CHECKPOINTS.slice(1).forEach(function (c, i) {
        var on = i + 1 <= cp, col = on ? '#39ff88' : '#8a7aa8';
        [c, c + 44].forEach(function (px) {
          ctx.fillStyle = OUT; ctx.fillRect(px - 2, GROUND - 76, 8, 76);
          ctx.fillStyle = col; ctx.fillRect(px, GROUND - 74, 4, 74);
          ctx.fillStyle = '#eaf6ff'; ctx.fillRect(px, GROUND - 74, 1, 74);
        });
        var wave = on ? Math.sin(t * 6) * 2 : 0;
        ctx.fillStyle = OUT; ctx.fillRect(c + 4, GROUND - 62 + wave, 40, 10);
        ctx.fillStyle = on ? '#39ff88' : '#ff2fb3'; ctx.fillRect(c + 4, GROUND - 60 + wave, 40, 6);
        ctx.textAlign = 'center';
        outlinedText(on ? 'SAVED' : 'CHECKPOINT', c + 24, GROUND - 84, col, '16px VT323, monospace');
      });
    }

    function drawGoal() {
      var L = FLAG - 20, R = FLAG + 70, top = GROUND - 200;
      [L, R].forEach(function (px) {
        ctx.fillStyle = OUT; ctx.fillRect(px - 3, top - 3, 14, 203);
        ctx.fillStyle = '#ffd23f'; ctx.fillRect(px, top, 8, 200);
        ctx.fillStyle = '#fff3b0'; ctx.fillRect(px, top, 3, 200);
        for (var y = top + 10; y < GROUND; y += 24) { ctx.fillStyle = '#c99a12'; ctx.fillRect(px, y, 8, 4); }
        ctx.fillStyle = OUT; ctx.fillRect(px - 5, top - 12, 18, 12);
        ctx.fillStyle = '#ff2fb3'; ctx.fillRect(px - 3, top - 10, 14, 8);
      });
      var ty = GROUND - 110 + Math.round(Math.sin(t * 2.2) * 80);
      ctx.fillStyle = OUT; ctx.fillRect(L + 8, ty - 2, R - L - 8, 12);
      ctx.fillStyle = '#2ee6ff'; ctx.fillRect(L + 8, ty, R - L - 8, 8);
      ctx.fillStyle = '#eaf6ff'; ctx.fillRect(L + 8, ty, R - L - 8, 2);
      ctx.textAlign = 'center';
      outlinedText('AI', FLAG + 29, ty + 8, '#ffd23f', '12px "Press Start 2P", monospace');
      outlinedText('TRAIN MODEL', FLAG + 29, top - 22, '#ffd23f', '24px VT323, monospace');
    }

    function draw() {
      var g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#0a0518'); g.addColorStop(0.5, '#2b1140'); g.addColorStop(0.78, '#ff2fb3'); g.addColorStop(1, '#ff7a3d');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      STARS.forEach(function (s) {
        if ((Math.floor(t * 2) + s[2] + s[0]) % 7 === 0) return;
        ctx.fillStyle = s[2] ? '#eaf6ff' : '#2ee6ff';
        ctx.fillRect(Math.round(((s[0] - camX * 0.02) % W + W) % W), s[1], 2, 2);
      });
      var sx = 620 - camX * 0.05, sy = 270;
      ctx.save(); ctx.beginPath(); ctx.arc(sx, sy, 120, Math.PI, 0); ctx.closePath(); ctx.clip();
      var sg = ctx.createLinearGradient(0, sy - 120, 0, sy); sg.addColorStop(0, '#ffd23f'); sg.addColorStop(1, '#ff2fb3');
      ctx.fillStyle = sg; ctx.fillRect(sx - 120, sy - 120, 240, 120);
      ctx.fillStyle = '#2b1140';
      for (var s = 0; s < 7; s++) ctx.fillRect(sx - 120, sy - 60 + s * 9, 240, 2 + s);
      ctx.restore();
      var off = Math.round(camX * 0.15) % 960;
      ctx.drawImage(skyline, -off, 110); ctx.drawImage(skyline, 960 - off, 110);
      ctx.fillStyle = '#16063a'; ctx.fillRect(0, 326, W, 8);
      for (var wv = 0; wv < 8; wv++) { ctx.fillStyle = 'rgba(46,230,255,0.5)'; ctx.fillRect(((wv * 131 - t * 20 - camX * 0.2) % W + W) % W, 328 + (wv % 2) * 3, 26, 2); }
      off = Math.round(camX * 0.35) % 960;
      ctx.drawImage(hills, -off, GROUND - 168); ctx.drawImage(hills, 960 - off, GROUND - 168);
      var po = (camX * 0.6) % 320;
      for (var px = -po - 40; px < W + 40; px += 320) ctx.drawImage(palmSprite, Math.round(px), GROUND - 168);

      var shx = shake > 0 ? Math.round((Math.random() - 0.5) * 8 * shake / 0.25) : 0;
      var shy = shake > 0 ? Math.round((Math.random() - 0.5) * 8 * shake / 0.25) : 0;
      ctx.save(); ctx.translate(-Math.round(camX) + shx, shy);
      drawGround();
      drawPlatforms();
      drawSign();
      drawCheckpoints();
      drawGoal();
      pickups.forEach(function (p, i) { if (!p.taken) drawCard(p, i); });
      bugs.forEach(drawBug);
      drawPlayer();
      particles.forEach(function (q) {
        ctx.globalAlpha = Math.min(1, q.life * 2); ctx.fillStyle = q.color;
        ctx.fillRect(Math.round(q.x), Math.round(q.y), q.size, q.size);
      });
      ctx.globalAlpha = 1;
      ctx.textAlign = 'center';
      toasts.forEach(function (o) {
        ctx.globalAlpha = Math.min(1, o.t * 2);
        outlinedText(o.text, o.x + 20, o.y, o.color, '24px VT323, monospace');
      });
      ctx.globalAlpha = 1;
      ctx.restore();
      if (flash) {
        ctx.fillStyle = 'rgba(255,47,179,' + flash + ')'; ctx.fillRect(0, 0, W, H);
        for (var gl = 0; gl < 6; gl++) { ctx.fillStyle = gl % 2 ? 'rgba(46,230,255,0.5)' : 'rgba(255,47,179,0.6)'; ctx.fillRect(0, Math.random() * H, W, 3 + Math.random() * 6); }
      }
      // scanlines for CRT feel
      ctx.fillStyle = 'rgba(10,5,24,0.12)';
      for (var y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);
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
