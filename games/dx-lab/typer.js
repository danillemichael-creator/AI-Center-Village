(function () {
  var W = 960, H = 480, GROUND = 400, OUT = '#0a0518';
  var TERMS = [
    ['model', 'A program that learned patterns from data.'],
    ['data', 'The examples an AI learns from.'],
    ['label', 'The right answer attached to an example.'],
    ['prompt', 'The instructions you give an AI.'],
    ['token', 'A small chunk of text an AI reads and writes.'],
    ['training', 'Showing a model examples so it learns.'],
    ['prediction', "The model's guess about new data."],
    ['accuracy', "How often the model's guesses are right."],
    ['dataset', 'A collection of examples used for training or testing.'],
    ['bias', 'When skewed data makes a model unfair or wrong.'],
    ['classifier', 'A model that sorts things into groups.'],
    ['test set', 'Examples held back to check a model honestly.'],
    ['overfitting', 'Memorizing the training data instead of learning the pattern.'],
    ['neural network', 'Layers of simple math units that learn together.'],
    ['hallucination', 'When an AI confidently makes something up.']
  ];

  function start(api) {
    var app = api.app, el = api.el;
    var hubButton = document.querySelector('.hub-btn');
    if (hubButton) hubButton.style.display = 'none';
    api.setStep('NEURAL TYPER');
    app.innerHTML = '';

    var wrap = el('div', 'card dash-wrap');
    var hud = el('div', 'dash-hud pixel');
    var hudWave = el('span', '', 'WAVE 1/3');
    var hudCleared = el('span', '', 'CLEARED: 0/15');
    var hudLives = el('span', '', 'LIVES: 3');
    var hudMute = el('span', '', '');
    hudMute.setAttribute('role', 'button');
    hudMute.setAttribute('tabindex', '0');
    hudMute.setAttribute('aria-label', 'Toggle sound');
    hudMute.style.cursor = 'pointer';
    function updateMute() { hudMute.textContent = window.DXSfx && window.DXSfx.muted() ? '♪ OFF' : '♪ ON'; }
    function toggleMute(e) {
      if (e) e.preventDefault();
      if (window.DXSfx) window.DXSfx.toggle();
      updateMute();
    }
    hudMute.addEventListener('click', toggleMute);
    hudMute.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') toggleMute(e);
    });
    hud.appendChild(hudWave); hud.appendChild(hudCleared); hud.appendChild(hudLives); hud.appendChild(hudMute);

    var canvas = el('canvas');
    canvas.id = 'typer'; canvas.width = W; canvas.height = H;
    canvas.style.cssText = 'width:100%;max-width:960px;display:block;margin:0 auto;border:2px solid var(--sun);border-radius:6px;image-rendering:pixelated';
    var input = el('input');
    input.type = 'text';
    input.setAttribute('autocapitalize', 'off');
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('autocorrect', 'off');
    input.setAttribute('spellcheck', 'false');
    input.setAttribute('aria-label', 'Type the falling AI words');
    input.style.cssText = 'position:absolute;left:2px;top:36px;width:1px;height:1px;opacity:0;z-index:2';
    var help = el('p', 'tip', 'Type the falling AI words to blast them. Wrong keys miss; Backspace or Escape unlocks a target.');
    var actions = el('div', 'actions');
    var quit = el('button', 'btn ghost', 'LEVEL SELECT');
    actions.appendChild(quit);
    wrap.appendChild(hud); wrap.appendChild(canvas); wrap.appendChild(input); wrap.appendChild(help);
    app.appendChild(wrap); app.appendChild(actions);

    var ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    var words = [], particles = [], lasers = [], definitions = [], shake = 0, flash = 0;
    var lives = 3, wave = 1, cleared = 0, nextTerm = 0, spawnTimer = 0.8, intermission = 0;
    var locked = null, totalKeys = 0, correctKeys = 0, misses = 0, running = true, last = 0, time = 0, frameId = 0;
    var banner = '', bannerTime = 0, finalWait = 0, ending = false;
    var stars = [];
    for (var si = 0; si < 72; si++) {
      var hx = Math.sin(si * 12.9898) * 43758.5453, hy = Math.sin(si * 78.233) * 12543.1;
      stars.push([Math.floor((hx - Math.floor(hx)) * W), Math.floor((hy - Math.floor(hy)) * 240), si % 3]);
    }

    function focusInput() {
      if (running) {
        try { input.focus({ preventScroll: true }); } catch (e) { input.focus(); }
      }
    }
    function sound(name) {
      if (window.DXSfx) window.DXSfx.play(name);
    }
    function stop() {
      running = false;
      window.removeEventListener('keydown', onKeyDown);
      input.removeEventListener('input', clearInput);
      canvas.removeEventListener('pointerdown', focusInput);
      if (frameId) cancelAnimationFrame(frameId);
    }
    function clearInput() { input.value = ''; }
    function onKeyDown(e) {
      if (!running || ending) return;
      if (e.key === 'Backspace' || e.key === 'Escape') {
        if (locked) {
          locked.typed = 0;
          locked = null;
        }
        e.preventDefault();
        return;
      }
      if (e.key.length !== 1 || !/^[a-z ]$/i.test(e.key)) return;
      e.preventDefault();
      var letter = e.key.toLowerCase();
      totalKeys++;
      if (!locked) {
        for (var i = 0; i < words.length; i++) {
          if (words[i].text.charAt(words[i].typed) === letter) {
            locked = words[i];
            break;
          }
        }
      }
      if (locked && locked.text.charAt(locked.typed) === letter) {
        locked.typed++;
        correctKeys++;
        locked.wrong = 0;
        sound('key');
        if (locked.typed === locked.text.length) completeWord(locked);
      } else {
        misses++;
        if (locked) {
          locked.wrong = 0.24;
          sound('wrong');
        }
      }
    }
    window.addEventListener('keydown', onKeyDown);
    input.addEventListener('input', clearInput);
    canvas.addEventListener('pointerdown', focusInput);
    quit.onclick = function () {
      stop();
      if (hubButton) hubButton.style.display = '';
      api.intro();
    };
    focusInput();
    updateMute();

    function burst(x, y, count, colors, speed) {
      for (var i = 0; i < count; i++) {
        var a = Math.random() * Math.PI * 2, v = speed * (0.35 + Math.random() * 0.75);
        particles.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - speed * 0.25,
          life: 0.35 + Math.random() * 0.55, color: colors[i % colors.length], size: 2 + i % 3 });
      }
    }
    function completeWord(w) {
      var x = w.x, y = w.y;
      lasers.push({ x1: W / 2, y1: GROUND - 13, x2: x, y2: y, life: 0.18 });
      burst(x, y, 22, ['#ffd23f', '#2ee6ff', '#ff2fb3', '#eaf6ff'], 190);
      sound('explode');
      definitions.unshift({ text: w.text, definition: w.definition });
      definitions = definitions.slice(0, 2);
      words = words.filter(function (target) { return target !== w; });
      if (locked === w) locked = null;
      cleared++;
      if (cleared === wave * 5 && wave < 3) {
        intermission = 1.7;
        banner = 'WAVE ' + (wave + 1) + '/3';
        bannerTime = intermission;
      } else if (cleared === 15) {
        ending = true;
        finalWait = 0.65;
        sound('win');
      }
    }
    function spawn() {
      var item = TERMS[nextTerm++];
      var x = 120 + ((nextTerm * 163) % 700);
      words.push({ text: item[0], definition: item[1], x: x, y: 48,
        speed: [28, 40, 53][wave - 1], typed: 0, wrong: 0, phase: Math.random() * 6.28 });
    }
    function update(dt) {
      time += dt;
      if (ending) {
        finalWait -= dt;
        if (finalWait <= 0) { stop(); results(true); }
        return;
      }
      if (intermission > 0) {
        intermission -= dt;
        bannerTime = intermission;
        if (intermission <= 0) {
          wave++;
          banner = '';
          spawnTimer = 0.7;
        }
      } else if (nextTerm < wave * 5) {
        spawnTimer -= dt;
        if (spawnTimer <= 0) {
          spawn();
          spawnTimer = [6.3, 4.15, 2.8][wave - 1];
        }
      }
      words.forEach(function (w) {
        w.y += w.speed * dt;
        w.wrong = Math.max(0, w.wrong - dt);
      });
      for (var i = words.length - 1; i >= 0; i--) {
        if (words[i].y >= GROUND - 12) {
          if (locked === words[i]) locked = null;
          words.splice(i, 1);
          lives--;
          shake = 0.38;
          flash = 0.18;
          sound('hurt');
          burst(words[i] ? words[i].x : W / 2, GROUND - 8, 12, ['#ff2fb3', '#ff7a3d', '#eaf6ff'], 120);
          if (lives <= 0) {
            stop();
            setTimeout(function () { results(false); }, 400);
            return;
          }
        }
      }
      particles.forEach(function (p) {
        p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 190 * dt; p.life -= dt;
      });
      particles = particles.filter(function (p) { return p.life > 0; });
      lasers.forEach(function (l) { l.life -= dt; });
      lasers = lasers.filter(function (l) { return l.life > 0; });
      shake = Math.max(0, shake - dt);
      flash = Math.max(0, flash - dt);
      hudWave.textContent = 'WAVE ' + wave + '/3';
      hudCleared.textContent = 'CLEARED: ' + cleared + '/15';
      hudLives.textContent = 'LIVES: ' + lives;
    }
    function outlinedText(text, x, y, color, font, align) {
      ctx.font = font || '18px VT323, monospace';
      ctx.textAlign = align || 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 4;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = OUT;
      ctx.strokeText(text, x, y);
      ctx.fillStyle = color;
      ctx.fillText(text, x, y);
    }
    function drawBackground() {
      var sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#0a0518'); sky.addColorStop(0.48, '#2b1140');
      sky.addColorStop(0.76, '#ff2fb3'); sky.addColorStop(1, '#ff7a3d');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
      stars.forEach(function (s) {
        if ((Math.floor(time * 2) + s[2] + s[0]) % 8 === 0) return;
        ctx.fillStyle = s[2] ? '#eaf6ff' : '#2ee6ff';
        ctx.fillRect(s[0], s[1], 2, 2);
      });
      var sx = 710, sy = 262;
      ctx.save(); ctx.beginPath(); ctx.arc(sx, sy, 118, Math.PI, 0); ctx.closePath(); ctx.clip();
      var sun = ctx.createLinearGradient(0, sy - 118, 0, sy);
      sun.addColorStop(0, '#ffd23f'); sun.addColorStop(1, '#ff2fb3');
      ctx.fillStyle = sun; ctx.fillRect(sx - 120, sy - 120, 240, 120);
      ctx.fillStyle = '#2b1140';
      for (var stripe = 0; stripe < 6; stripe++) ctx.fillRect(sx - 120, sy - 62 + stripe * 10, 240, 3 + stripe);
      ctx.restore();
      var buildings = [[0, 105, 90], [90, 150, 130], [230, 95, 72], [330, 132, 110],
        [470, 120, 150], [600, 100, 90], [720, 145, 125], [875, 120, 100]];
      buildings.forEach(function (b, i) {
        var top = 365 - b[2];
        ctx.fillStyle = OUT; ctx.fillRect(b[0] - 2, top - 2, b[1] + 4, b[2] + 4);
        ctx.fillStyle = i % 2 ? '#1b0b33' : '#26124a'; ctx.fillRect(b[0], top, b[1], b[2]);
        ctx.fillStyle = i % 2 ? '#ff2fb3' : '#2ee6ff'; ctx.fillRect(b[0] + 4, top + 9, b[1] - 8, 3);
        for (var wy = top + 22; wy < 355; wy += 18) {
          for (var wx = b[0] + 10; wx < b[0] + b[1] - 8; wx += 16) {
            if ((wx + wy + i) % 3 !== 0) {
              ctx.fillStyle = (wx + wy) % 2 ? '#ffd23f' : '#2ee6ff';
              ctx.fillRect(wx, wy, 5, 7);
            }
          }
        }
      });
      ctx.fillStyle = '#143247'; ctx.fillRect(0, 365, W, 34);
      ctx.fillStyle = 'rgba(46,230,255,0.55)';
      for (var waveLine = 0; waveLine < 8; waveLine++)
        ctx.fillRect((waveLine * 139 + Math.floor(time * 22)) % W, 371 + waveLine % 3 * 5, 28, 2);
      ctx.fillStyle = OUT; ctx.fillRect(0, GROUND - 2, W, 8);
      ctx.fillStyle = '#ff2fb3'; ctx.fillRect(0, GROUND, W, 6);
      ctx.fillStyle = '#ff8ad8'; ctx.fillRect(0, GROUND, W, 2);
      ctx.fillStyle = '#2b1140'; ctx.fillRect(0, GROUND + 6, W, H - GROUND - 6);
      for (var tile = 0; tile < W; tile += 40) {
        ctx.fillStyle = '#3d1a63'; ctx.fillRect(tile, 419, 38, 3);
        ctx.fillStyle = '#5a2a8c'; ctx.fillRect(tile + 5, 432, 8, 4);
      }
    }
    function drawHeart(x, y, full) {
      var pattern = ['.xx.xx.', 'xxxxxxx', 'xxxxxxx', '.xxxxx.', '..xxx..', '...x...'];
      var color = full ? '#ff2fb3' : '#53233f';
      pattern.forEach(function (row, ry) {
        for (var rx = 0; rx < row.length; rx++) {
          if (row.charAt(rx) !== 'x') continue;
          ctx.fillStyle = OUT; ctx.fillRect(x + rx * 3 - 1, y + ry * 3 - 1, 5, 5);
          ctx.fillStyle = color; ctx.fillRect(x + rx * 3, y + ry * 3, 3, 3);
        }
      });
    }
    function drawMeteor(w) {
      var x = Math.round(w.x), y = Math.round(w.y), flicker = Math.floor(time * 16 + w.phase) % 3;
      var flame = ['#ff2fb3', '#ff7a3d', '#ffd23f'];
      for (var f = 0; f < 5; f++) {
        var fx = x + ((f * 7 + flicker * 3) % 17) - 8;
        ctx.fillStyle = OUT; ctx.fillRect(fx - 2, y - 20 - f * 4, 8, 9);
        ctx.fillStyle = flame[(f + flicker) % flame.length]; ctx.fillRect(fx, y - 19 - f * 4, 4, 7);
      }
      var rock = ['...oooo...', '..oooooo..', '.oooooooo.', 'oooooooooo', 'oooooooooo', '.oooooooo.', '..oooooo..', '...oooo...'];
      rock.forEach(function (row, ry) {
        for (var rx = 0; rx < row.length; rx++) {
          if (row.charAt(rx) !== 'o') continue;
          ctx.fillStyle = OUT; ctx.fillRect(x - 22 + rx * 5, y - 19 + ry * 5, 6, 6);
          ctx.fillStyle = ry < 3 ? '#8a8fa8' : '#5a4a77'; ctx.fillRect(x - 21 + rx * 5, y - 18 + ry * 5, 4, 4);
        }
      });
      ctx.fillStyle = '#eaf6ff'; ctx.fillRect(x - 10, y - 10, 4, 3);
      ctx.fillStyle = OUT; ctx.fillRect(x - 22, y + 25, 46, 24);
      if (locked === w) {
        ctx.fillStyle = 'rgba(255,210,63,0.12)'; ctx.fillRect(x - 20, y + 27, 42, 19);
        ctx.strokeStyle = w.wrong > 0 ? '#ff2fb3' : '#ffd23f';
        ctx.lineWidth = 2; ctx.strokeRect(x - 21, y + 26, 44, 21);
      }
      var text = w.text, font = '18px VT323, monospace';
      ctx.font = font;
      var tw = ctx.measureText(text).width;
      var tx = x - tw / 2, ty = y + 37;
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.lineWidth = 3;
      ctx.lineJoin = 'round'; ctx.strokeStyle = OUT; ctx.strokeText(text, tx, ty);
      for (var ci = 0; ci < text.length; ci++) {
        ctx.fillStyle = ci < w.typed ? '#ffd23f' : '#eaf6ff';
        ctx.fillText(text.charAt(ci), tx, ty);
        tx += ctx.measureText(text.charAt(ci)).width;
      }
    }
    function drawTurret() {
      var x = W / 2, y = GROUND - 18;
      ctx.fillStyle = OUT; ctx.fillRect(x - 23, y - 3, 46, 23);
      ctx.fillStyle = '#2b1140'; ctx.fillRect(x - 20, y, 40, 16);
      ctx.fillStyle = '#2ee6ff'; ctx.fillRect(x - 15, y - 5, 30, 8);
      ctx.fillStyle = '#eaf6ff'; ctx.fillRect(x - 6, y - 8, 12, 8);
      ctx.fillStyle = '#ff2fb3'; ctx.fillRect(x - 20, y + 10, 40, 4);
    }
    function drawEffects() {
      lasers.forEach(function (l) {
        ctx.globalAlpha = Math.min(1, l.life * 7);
        ctx.strokeStyle = '#eaf6ff'; ctx.lineWidth = 7;
        ctx.beginPath(); ctx.moveTo(l.x1, l.y1); ctx.lineTo(l.x2, l.y2); ctx.stroke();
        ctx.strokeStyle = '#2ee6ff'; ctx.lineWidth = 3; ctx.stroke();
      });
      ctx.globalAlpha = 1;
      particles.forEach(function (p) {
        ctx.globalAlpha = Math.min(1, p.life * 2);
        ctx.fillStyle = p.color; ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
      });
      ctx.globalAlpha = 1;
    }
    function drawLog() {
      ctx.fillStyle = OUT; ctx.fillRect(9, 423, W - 18, 51);
      ctx.fillStyle = '#2b1140'; ctx.fillRect(12, 426, W - 24, 45);
      ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 2; ctx.strokeRect(12, 426, W - 24, 45);
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.font = '11px "Press Start 2P", monospace';
      ctx.fillStyle = '#ffd23f'; ctx.fillText('DEFINITION LOG', 24, 438);
      ctx.font = '15px VT323, monospace';
      for (var i = 0; i < definitions.length; i++) {
        var d = definitions[i];
        ctx.fillStyle = '#2ee6ff'; ctx.fillText(d.text + ':', 24, 451 + i * 12);
        ctx.fillStyle = '#eaf6ff'; ctx.fillText(d.definition, 125, 451 + i * 12, W - 150);
      }
    }
    function draw() {
      drawBackground();
      var sx = shake > 0 ? Math.round((Math.random() - 0.5) * 12 * shake / 0.38) : 0;
      var sy = shake > 0 ? Math.round((Math.random() - 0.5) * 10 * shake / 0.38) : 0;
      ctx.save(); ctx.translate(sx, sy);
      words.forEach(drawMeteor);
      drawEffects();
      drawTurret();
      ctx.restore();
      drawLog();
      for (var h = 0; h < 3; h++) drawHeart(22 + h * 27, 22, h < lives);
      outlinedText('TERMS ' + cleared + ' / 15', W - 110, 31, '#ffd23f', '15px VT323, monospace');
      if (bannerTime > 0 && banner) {
        ctx.fillStyle = 'rgba(10,5,24,0.82)'; ctx.fillRect(260, 170, 440, 82);
        ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 3; ctx.strokeRect(260, 170, 440, 82);
        outlinedText(banner, W / 2, 212, '#2ee6ff', '30px "Press Start 2P", monospace');
      }
      if (flash > 0) {
        ctx.fillStyle = 'rgba(255,47,179,' + (flash * 0.7) + ')'; ctx.fillRect(0, 0, W, H);
      }
      ctx.fillStyle = 'rgba(10,5,24,0.12)';
      for (var scan = 0; scan < H; scan += 3) ctx.fillRect(0, scan, W, 1);
    }
    function frame(ts) {
      if (!running) return;
      var dt = last ? Math.min(0.033, (ts - last) / 1000) : 0.016;
      last = ts;
      update(dt);
      if (!running) return;
      draw();
      frameId = requestAnimationFrame(frame);
    }
    frameId = requestAnimationFrame(frame);

    function addActions(container, won) {
      var actionsRow = el('div', 'actions');
      if (won) {
        var hub = el('button', 'btn', 'Back to AI Center');
        hub.onclick = function () {
          if (hubButton) hubButton.style.display = '';
          AIVice.backToHub();
        };
        actionsRow.appendChild(hub);
      }
      var again = el('button', 'btn ghost', 'RUN IT AGAIN');
      again.onclick = function () { start(api); };
      var select = el('button', 'btn ghost', 'LEVEL SELECT');
      select.onclick = function () {
        if (hubButton) hubButton.style.display = '';
        api.intro();
      };
      actionsRow.appendChild(again); actionsRow.appendChild(select);
      container.appendChild(actionsRow);
    }
    function results(won) {
      api.setStep(won ? 'NEURAL TYPER · RESULTS' : 'NEURAL TYPER · GAME OVER');
      app.innerHTML = '';
      var card = el('div', 'card panel intro');
      if (won) {
        var earned = AIVice.markComplete(api.GAME_ID);
        if (earned) AIVice.addTokens(api.GAME_ID, 50);
        api.refreshTokens();
        card.innerHTML = '<h2>All meteors cleared!</h2><p class="lead">You saved Ocean Drive with <b>' + lives +
          '</b> ' + (lives === 1 ? 'life' : 'lives') + ' left. Correct keys: <b style="color:var(--sun)">' +
          correctKeys + ' / ' + totalKeys + '</b> (' + (totalKeys ? Math.round(correctKeys / totalKeys * 100) : 0) +
          '% accuracy).</p>';
        card.appendChild(el('div', 'big-tokens', earned ? '+50 AI TOKENS' : 'DX LAB ALREADY CLEARED'));
        var glossary = el('div', 'card insight');
        glossary.style.color = '#eaf6ff';
        glossary.appendChild(el('h3', '', 'NEURAL TYPER GLOSSARY'));
        TERMS.forEach(function (term, i) {
          glossary.appendChild(el('p', '', '<b style="color:var(--aqua)">' + (i + 1) + '. ' + term[0] +
            '</b>: ' + term[1]));
        });
        card.appendChild(glossary);
      } else {
        card.innerHTML = '<h2>The meteors got through</h2><p class="lead">You cleared <b style="color:var(--sun)">' +
          cleared + '</b> of 15 terms before Ocean Drive ran out of lives.</p>';
      }
      app.appendChild(card);
      addActions(app, won);
    }

    window.DXTyper.state = function () {
      return { words: words, lives: lives, wave: wave, cleared: cleared, running: running, locked: locked };
    };
  }

  window.DXTyper = { start: start };
})();
