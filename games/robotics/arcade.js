import { ARENA, BENCHES, ARCADE_MISSIONS, createArcadeState, startArcade, pauseArcade, tickArcade, activateAbility, missionProgress, objectiveComplete, claimArcadeReward } from './arcade-model.js';

const robotBadge = `<svg viewBox="0 0 80 80" aria-hidden="true"><path fill="#243445" d="M17 39h46v27H17zM8 50h12v24H8zM60 50h12v24H60zM21 10h38v30H21zM38 2h4v10h-4z"/><path fill="#eaa83c" d="M24 13h32v23H24zM21 43h38v19H21z"/><path fill="#fff0ce" d="M29 19h8v9h-8zM44 19h8v9h-8z"/><path fill="#138c84" d="M29 48h23v6H29z"/></svg>`;
const missionNumber = id => String(['sensors', 'motors', 'controllers', 'power'].indexOf(id) + 1).padStart(2, '0');

/** Animated workshop arcade; all coordinates and rules are browser simulations. */
export function mountArcade(id, container, { onComplete = () => {}, playSound = () => {}, unlockedParts = [], bestScore = 0 } = {}) {
  const mission = ARCADE_MISSIONS[id];
  if (!mission) throw new Error(`Unknown arcade mission: ${id}`);
  let state = createArcadeState(id, unlockedParts);
  let disposed = false;
  let awardSent = false;
  let frameId;
  let previousTime = 0;
  let overlayMode = '';
  let lastMessage = '';
  let lastProgress = '';
  let particles = [];
  let floaters = [];
  let nudge = null;
  const keys = new Set();
  const pressedPointers = new Map();
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false;

  container.innerHTML = `<section class="arcade-shell" aria-label="${mission.title} action game">
    <div class="arcade-hud"><div class="arcade-health-block"><small>ROBOT HEALTH</small><strong class="arcade-health" aria-label="${state.health} hearts remaining"></strong></div><div class="arcade-score-block"><small>SCORE</small><strong class="arcade-score">00000</strong></div><div class="arcade-combo" aria-label="Combo multiplier">LET’S ROLL</div><button class="arcade-pause-button" type="button" aria-label="Pause game" data-action="pause">Ⅱ <span>PAUSE</span></button></div>
    <div class="arcade-stage"><canvas class="arcade-canvas" width="960" height="540" tabindex="0" aria-label="Workshop arena. Move with arrow keys or W A S D. Space uses ${mission.special.toLowerCase()}. P pauses. Touch controls are below.">Your browser needs canvas support to display this action game.</canvas><div class="arcade-overlay"></div><div class="arcade-bubble" aria-hidden="true"></div></div>
    <div class="arcade-mission-bar"><span class="arcade-goal" role="status" aria-live="polite"></span><button class="arcade-special" type="button" data-action="special" aria-label="Use ${mission.special.toLowerCase()}"><span class="arcade-special-icon" aria-hidden="true">${{ sensors: '◎', motors: 'ϟ', controllers: '❄', power: '◇' }[id]}</span><span class="arcade-special-label">${mission.verb}</span><kbd>SPACE</kbd></button></div>
    <div class="arcade-touch-controls" aria-label="Touch movement controls"><div class="arcade-dpad"><button class="arcade-pad-button arcade-pad-up" type="button" data-direction="up" aria-label="Move up">↑</button><button class="arcade-pad-button arcade-pad-left" type="button" data-direction="left" aria-label="Move left">←</button><button class="arcade-pad-button arcade-pad-down" type="button" data-direction="down" aria-label="Move down">↓</button><button class="arcade-pad-button arcade-pad-right" type="button" data-direction="right" aria-label="Move right">→</button></div><span>Move your robot.<br>Tap ${mission.verb.toLowerCase()} for your special.</span><button class="arcade-touch-special" type="button" data-action="special" aria-label="Use ${mission.special.toLowerCase()}">${mission.verb}</button></div>
    <p class="arcade-status" role="status" aria-live="polite"></p><div class="arcade-footer"><span><kbd>WASD</kbd> / <kbd>↑ ← ↓ →</kbd> MOVE <b>·</b> <kbd>SPACE</kbd> ${mission.verb} <b>·</b> <kbd>P</kbd> PAUSE</span><span>CLASSROOM MODEL · NO COUNTDOWN</span></div>
  </section>`;
  const shell = container.querySelector('.arcade-shell');
  const canvas = container.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) { container.innerHTML = '<p>Canvas is unavailable in this browser. Try the interactive lab challenge instead.</p>'; return () => {}; }
  ctx.imageSmoothingEnabled = false;
  const overlay = container.querySelector('.arcade-overlay');
  const health = container.querySelector('.arcade-health');
  const score = container.querySelector('.arcade-score');
  const combo = container.querySelector('.arcade-combo');
  const goal = container.querySelector('.arcade-goal');
  const status = container.querySelector('.arcade-status');
  const special = container.querySelector('.arcade-special');
  const specialLabel = container.querySelector('.arcade-special-label');
  const pauseButton = container.querySelector('.arcade-pause-button');

  function rect(x, y, width, height, fill) { ctx.fillStyle = fill; ctx.fillRect(Math.round(x), Math.round(y), Math.round(width), Math.round(height)); }
  function text(value, x, y, size = 12, color = '#fff0cd', align = 'left') { ctx.fillStyle = color; ctx.font = `bold ${size}px monospace`; ctx.textAlign = align; ctx.fillText(value, Math.round(x), Math.round(y)); }
  function circle(x, y, radius, fill) { ctx.fillStyle = fill; ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill(); }
  function strokeCircle(x, y, radius, color, width = 2) { ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.stroke(); }

  function updateHud() {
    if (shell.dataset.mode !== state.mode) shell.dataset.mode = state.mode;
    const hearts = '♥'.repeat(state.health) + '♡'.repeat(state.maxHealth - state.health);
    if (health.textContent !== hearts) { health.textContent = hearts; health.setAttribute('aria-label', `${state.health} of ${state.maxHealth} hearts remaining`); }
    score.textContent = String(state.score).padStart(5, '0');
    combo.textContent = state.combo > 1 ? `×${state.combo} COMBO!` : state.upgrades.length ? `${state.upgrades.length} UPGRADES ON` : 'LET’S ROLL';
    combo.classList.toggle('arcade-combo-hot', state.combo > 1);
    const currentProgress = missionProgress(state);
    if (currentProgress !== lastProgress) { goal.textContent = currentProgress; lastProgress = currentProgress; }
    goal.classList.toggle('arcade-return-goal', objectiveComplete(state));
    const message = state.messageTimer > 0 ? state.message : 'Collect sparks for bonus points. Keep moving and watch the scrapbots!';
    if (message !== lastMessage) { status.textContent = message; lastMessage = message; }
    special.disabled = state.mode !== 'playing' || state.cooldown > 0;
    specialLabel.textContent = state.cooldown > 0 ? `${Math.ceil(state.cooldown)}s` : mission.verb;
    special.style.setProperty('--arcade-ready', state.cooldown > 0 ? '0' : '1');
    pauseButton.disabled = !['playing', 'paused'].includes(state.mode);
    pauseButton.setAttribute('aria-label', state.mode === 'paused' ? 'Resume game' : 'Pause game');
    const pauseText = pauseButton.querySelector('span');
    const pauseLabel = state.mode === 'paused' ? 'RESUME' : 'PAUSE';
    if (pauseText.textContent !== pauseLabel) pauseText.textContent = pauseLabel;
  }

  function setOverlay() {
    if (overlayMode === state.mode) return;
    overlayMode = state.mode;
    overlay.hidden = state.mode === 'playing';
    if (state.mode === 'playing') { overlay.innerHTML = ''; return; }
    const controls = `<div class="arcade-start-controls"><span><kbd>↑ ← ↓ →</kbd><small>MOVE</small></span><span><kbd>SPACE</kbd><small>${mission.verb}</small></span><span><kbd>P</kbd><small>PAUSE</small></span></div>`;
    if (state.mode === 'ready') {
      const upgradeNames = { motors: 'FASTER WHEELS', sensors: 'WIDE SCANNER', controllers: 'QUICKER SPECIAL', power: 'EXTRA HEART' };
      overlay.innerHTML = `<div class="arcade-overlay-card"><span class="arcade-eyebrow">WORKSHOP ARCADE / MISSION ${missionNumber(id)}</span><div class="arcade-hero-robot">${robotBadge}</div><h3>${mission.title}</h3><p>${mission.instruction}</p>${controls}${state.upgrades.length ? `<div class="arcade-upgrade-list">${state.upgrades.map(part => `<span>+ ${upgradeNames[part]}</span>`).join('')}</div>` : ''}<button class="arcade-main-button" type="button" data-action="start">LET’S ROLL <span aria-hidden="true">▶</span></button><small>${bestScore ? `YOUR BEST ${Number(bestScore).toLocaleString()} · ` : ''}No timer. Find your flow.</small></div>`;
    } else if (state.mode === 'paused') {
      overlay.innerHTML = `<div class="arcade-overlay-card arcade-small-card"><span class="arcade-eyebrow">TAKE A BREATHER</span><h3>Robot on a break.</h3><p>Your workshop will wait.</p><button class="arcade-main-button" type="button" data-action="resume">KEEP ROLLING <span aria-hidden="true">▶</span></button><button class="arcade-plain-button" type="button" data-action="restart">Start this mission again</button></div>`;
    } else if (state.mode === 'lost') {
      overlay.innerHTML = `<div class="arcade-overlay-card arcade-small-card"><span class="arcade-eyebrow">BACK TO THE WORKBENCH</span><div class="arcade-hero-robot">${robotBadge}</div><h3>A few loose screws.</h3><p>The scrapbots won this round. A fresh robot is ready for another go.</p><div class="arcade-final-score"><small>THIS RUN</small><strong>${state.score.toLocaleString()}</strong></div><button class="arcade-main-button" type="button" data-action="restart">ONE MORE GO <span aria-hidden="true">↻</span></button><small>Tip: keep moving. Your special can get you out of trouble.</small></div>`;
    } else if (state.mode === 'won') {
      overlay.innerHTML = `<div class="arcade-overlay-card arcade-win-card"><span class="arcade-eyebrow">MISSION COMPLETE!</span><div class="arcade-hero-robot">${robotBadge}</div><h3>Now that’s a good bot.</h3><div class="arcade-final-score"><small>FINAL SCORE · INCLUDES ${state.health * 100} HEALTH BONUS</small><strong>${state.score.toLocaleString()}</strong></div><p>${mission.lesson}</p><div class="arcade-earned">PART EARNED <strong>${mission.part}</strong></div><button class="arcade-main-button" type="button" data-action="collect">ADD TO MY ROBOT <span aria-hidden="true">→</span></button><button class="arcade-plain-button" type="button" data-action="restart">Play again</button></div>`;
    }
    overlay.querySelector('button')?.focus({ preventScroll: true });
  }

  function clearInput() { keys.clear(); pressedPointers.clear(); nudge = null; shell.querySelectorAll('.arcade-pad-pressed').forEach(button => button.classList.remove('arcade-pad-pressed')); }
  function begin() { if (startArcade(state)) { playSound('click'); clearInput(); setOverlay(); canvas.focus({ preventScroll: true }); } }
  function resume() { if (state.mode === 'paused') { pauseArcade(state); clearInput(); setOverlay(); canvas.focus({ preventScroll: true }); } }
  function restart() { state = createArcadeState(id, unlockedParts); particles = []; floaters = []; clearInput(); overlayMode = ''; startArcade(state); setOverlay(); canvas.focus({ preventScroll: true }); playSound('click'); }
  function doSpecial() { if (activateAbility(state)) playSound('click'); }

  function onClick(event) {
    const button = event.target.closest('button');
    if (!button || !shell.contains(button)) return;
    const action = button.dataset.action;
    if (action === 'start') begin();
    else if (action === 'resume') resume();
    else if (action === 'restart') restart();
    else if (action === 'pause') { if (pauseArcade(state)) { clearInput(); setOverlay(); if (state.mode === 'playing') canvas.focus({ preventScroll: true }); } }
    else if (action === 'special') doSpecial();
    else if (action === 'collect' && !awardSent && claimArcadeReward(state)) { awardSent = true; onComplete(id, { score: state.score }); }
    else if (button.dataset.direction && event.detail === 0) {
      const [x, y] = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[button.dataset.direction];
      nudge = { x, y, remaining: 0.17 };
    }
  }

  const movementKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'];
  function onKeyDown(event) {
    if (disposed) return;
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if (key === 'p' && !event.repeat && ['playing', 'paused'].includes(state.mode)) { event.preventDefault(); pauseArcade(state); clearInput(); setOverlay(); if (state.mode === 'playing') canvas.focus({ preventScroll: true }); return; }
    if (state.mode !== 'playing') return;
    if (movementKeys.includes(key)) { event.preventDefault(); keys.add(key); }
    // Let native buttons handle Space once; the canvas uses it for the special.
    if (key === ' ' && event.target.closest?.('button')) return;
    if (key === ' ' && !event.repeat) { event.preventDefault(); doSpecial(); }
  }
  function onKeyUp(event) { const key = event.key.length === 1 ? event.key.toLowerCase() : event.key; keys.delete(key); }
  function onPointerDown(event) {
    const button = event.target.closest('[data-direction]');
    if (!button || state.mode !== 'playing') return;
    event.preventDefault();
    pressedPointers.set(event.pointerId, button.dataset.direction);
    button.classList.add('arcade-pad-pressed');
    button.setPointerCapture?.(event.pointerId);
  }
  function onPointerUp(event) {
    const direction = pressedPointers.get(event.pointerId);
    if (direction) shell.querySelector(`[data-direction="${direction}"]`)?.classList.remove('arcade-pad-pressed');
    pressedPointers.delete(event.pointerId);
  }
  function autoPause() { if (state.mode === 'playing') { pauseArcade(state); clearInput(); setOverlay(); } }
  function onVisibility() { if (document.hidden) autoPause(); }
  shell.addEventListener('click', onClick);
  shell.addEventListener('keydown', onKeyDown);
  shell.addEventListener('pointerdown', onPointerDown);
  shell.addEventListener('pointerup', onPointerUp);
  shell.addEventListener('pointercancel', onPointerUp);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', autoPause);
  document.addEventListener('visibilitychange', onVisibility);

  function drawRoom(time) {
    rect(0, 0, 960, 540, '#21343d');
    rect(27, 42, 906, 474, '#c5af85');
    for (let row = 0; row < 11; row++) for (let col = 0; col < 20; col++) {
      const x = 30 + col * 46, y = 47 + row * 43;
      rect(x, y, 44, 41, (row + col) % 2 ? '#c5b38f' : '#cebc98');
      if ((row * 7 + col * 3) % 13 === 0) rect(x + 25, y + 27, 5, 2, '#b4a07c');
    }
    rect(27, 43, 906, 8, '#867756'); rect(27, 507, 906, 10, '#8b7957');
    rect(22, 27, 15, 492, '#3a4b4e'); rect(923, 27, 15, 492, '#3a4b4e');
    rect(37, 8, 886, 35, '#3d5b5c'); rect(37, 37, 886, 8, '#293d44');
    for (let x = 48; x < 910; x += 82) { rect(x, 11, 65, 22, '#58746a'); rect(x + 4, 14, 15, 13, '#e6c67d'); rect(x + 24, 14, 21, 13, '#a3754e'); }
    rect(405, 8, 165, 30, '#233d43'); text('THE ROBOT WORKSHOP', 487, 27, 12, '#c3d7ba', 'center');
    // Caution stripes mark the arena edge.
    for (let y = 75; y < 480; y += 30) { rect(30, y, 7, 14, '#e8b447'); rect(923, y, 7, 14, '#e8b447'); }
    // Home dock and its charging rails.
    rect(55, 403, 90, 90, '#60988a'); rect(61, 409, 78, 78, '#477c75');
    ctx.setLineDash([7, 5]); ctx.strokeStyle = objectiveComplete(state) ? '#fff0a8' : '#a6d4b4'; ctx.lineWidth = 3; ctx.strokeRect(63, 411, 74, 74); ctx.setLineDash([]);
    text(objectiveComplete(state) ? 'COME HOME!' : 'HOME DOCK', 100, 399, 11, objectiveComplete(state) ? '#fff0be' : '#41675c', 'center');
    text('H', 100, 462, 37, '#99c7a8', 'center');
    for (const [index, bench] of BENCHES.entries()) {
      rect(bench.x + 4, bench.y + 14, bench.w, bench.h + 12, '#9c8769');
      rect(bench.x + 8, bench.y + bench.h - 1, 10, 16, '#6f614c'); rect(bench.x + bench.w - 18, bench.y + bench.h - 1, 10, 16, '#6f614c');
      rect(bench.x, bench.y, bench.w, bench.h, '#684f38'); rect(bench.x + 3, bench.y + 3, bench.w - 6, bench.h - 8, '#c28d4d'); rect(bench.x + 7, bench.y + 6, bench.w - 14, bench.h - 14, '#d7ac65');
      rect(bench.x + 17, bench.y + 11, 48, 24, '#3d756d'); rect(bench.x + 21, bench.y + 15, 40, 2, '#8da978');
      rect(bench.x + bench.w - 31, bench.y + 10, 15, 18, '#d2533c'); rect(bench.x + bench.w - 30, bench.y + 11, 13, 3, '#ef9872');
      rect(bench.x + 79, bench.y + 16, 28, 4, '#56666a'); rect(bench.x + 85, bench.y + 11, 5, 17, '#b9c0a8');
      if (index === 2) { rect(bench.x + 5, bench.y + 4, 40, 8, '#416961'); }
    }
    // A few floor accents keep the map readable rather than filling walkways.
    text('SCRAPBOT TEST ZONE', 770, 498, 11, '#8c795b', 'center');
    if (objectiveComplete(state)) {
      ctx.save(); ctx.strokeStyle = '#f6f1b0'; ctx.lineWidth = 3; ctx.setLineDash([8, 10]); ctx.beginPath(); ctx.moveTo(state.player.x, state.player.y); ctx.lineTo(100, 450); ctx.stroke(); ctx.restore();
    }
  }

  function drawRobot(body, enemy = false) {
    const moving = enemy ? body.stunned <= 0 && state.mode === 'playing' : body.moving && state.mode === 'playing';
    const bob = !reducedMotion && moving ? Math.floor(Math.sin(state.elapsed * 17) * 1.4) : 0;
    const blink = !enemy && state.invulnerable > 0 && !reducedMotion && Math.floor(state.elapsed * 12) % 2 === 0;
    ctx.save(); ctx.translate(Math.round(body.x), Math.round(body.y + bob));
    ctx.fillStyle = '#4b4e3e55'; ctx.beginPath(); ctx.ellipse(0, 15, 21, 9, 0, 0, Math.PI * 2); ctx.fill();
    if (enemy && body.stunned > 0) { text('Z z', 0, -27, 14, '#edf9d0', 'center'); }
    if (blink) ctx.globalAlpha = 0.5;
    if (!enemy) ctx.rotate(Math.atan2(body.dy, body.dx) + Math.PI / 2);
    const track = Math.floor(state.elapsed * (moving ? 14 : 0)) % 3;
    rect(-23, -13, 9, 32, '#25333e'); rect(14, -13, 9, 32, '#25333e');
    for (let y = -11 + track; y < 17; y += 7) { rect(-22, y, 7, 3, '#647277'); rect(15, y, 7, 3, '#647277'); }
    rect(-15, -17, 30, 36, enemy ? '#914332' : '#9b743a'); rect(-12, -19, 24, 33, enemy ? '#dc634a' : '#edb94f');
    rect(-11, -19, 22, 5, enemy ? '#f59b6c' : '#ffe19a'); rect(-9, -11, 18, 10, '#263f45');
    rect(-7, -9, 5, 5, enemy ? '#ffcd87' : '#b9ead0'); rect(3, -9, 5, 5, enemy ? '#ffcd87' : '#b9ead0');
    rect(-5, 4, 10, 5, enemy ? '#613a31' : '#4c887a');
    rect(-2, -26, 4, 8, '#354b4e'); rect(-4, -29, 8, 5, enemy ? '#ef9a55' : '#77c8ad');
    if (!enemy && state.carrying) { rect(-9, 12, 18, 13, '#387e68'); rect(-6, 14, 12, 8, '#c5ef96'); }
    ctx.restore();
    if (!enemy && state.shield > 0) { strokeCircle(body.x, body.y, 31, '#a5ecc2', 4); strokeCircle(body.x, body.y, 35, '#74cda288', 2); }
    if (!enemy && state.upgrades.includes('sensors')) { ctx.save(); ctx.setLineDash([3, 9]); strokeCircle(body.x, body.y, 66, '#42796c66'); ctx.restore(); }
  }

  function drawPickup(item) {
    if (item.taken) return;
    const bob = reducedMotion ? 0 : Math.sin(state.elapsed * 4 + item.index) * 3;
    const x = item.x, y = item.y + bob;
    if (!item.revealed) {
      // Tiny signal sparks hint where to scan, but cannot be collected yet.
      if (reducedMotion || Math.sin(state.elapsed * 2 + item.index) > 0.1) { rect(x - 2, y - 2, 4, 4, '#9d9769'); rect(x + 4, y - 8, 2, 2, '#ece4ad'); }
      return;
    }
    circle(x, y + 7, 21, '#a5936866');
    if (id === 'controllers') {
      const active = item.index === state.collected;
      if (active) strokeCircle(x, y, 25, '#fff0bd', 3);
      rect(x - 16, y - 16, 32, 32, active ? '#2b8176' : '#81765c'); rect(x - 12, y - 12, 24, 24, active ? '#65b69a' : '#b4a080');
      text(String(item.index + 1), x, y + 7, 24, '#fff6d5', 'center');
    } else if (id === 'motors') {
      ctx.save(); ctx.translate(x, y); if (!reducedMotion) ctx.rotate(state.elapsed * .6); for (let i = 0; i < 8; i++) { ctx.save(); ctx.rotate(i * Math.PI / 4); rect(-4, -19, 8, 10, '#e39d30'); ctx.restore(); } circle(0, 0, 14, '#f7c75b'); circle(0, 0, 6, '#89714a'); ctx.restore();
    } else if (id === 'power') {
      rect(x - 13, y - 17, 26, 34, '#2e705d'); rect(x - 9, y - 13, 18, 25, '#b3d986'); rect(x - 5, y - 21, 10, 5, '#e5d894'); text('ϟ', x, y + 8, 27, '#3f7459', 'center');
    } else {
      rect(x - 14, y - 11, 28, 22, '#245e63'); rect(x - 10, y - 8, 20, 16, '#63baa6');
      for (let i = -9; i <= 9; i += 6) { rect(x + i, y - 15, 3, 5, '#e9d487'); rect(x + i, y + 10, 3, 5, '#e9d487'); }
      text('◎', x, y + 6, 19, '#173d49', 'center');
    }
  }

  function drawWorld() {
    ctx.save();
    if (!reducedMotion && state.shake > 0) ctx.translate(Math.sin(state.elapsed * 150) * 3, Math.cos(state.elapsed * 180) * 2);
    drawRoom(state.elapsed);
    if (state.id === 'power') state.stations.forEach((station, i) => {
      rect(station.x - 23, station.y - 24, 46, 48, '#655b45'); rect(station.x - 19, station.y - 20, 38, 40, station.charged ? '#4c9e7d' : '#9d8560'); rect(station.x - 14, station.y - 15, 28, 14, station.charged ? '#b9eaa3' : '#574d40'); text(station.charged ? 'ON' : 'ϟ', station.x, station.y - 4, 13, station.charged ? '#367356' : '#c1a578', 'center'); text(`STATION ${i + 1}`, station.x, station.y + 39, 9, '#765e41', 'center');
    });
    state.sparks.forEach((spark, index) => { if (spark.taken) return; const bob = reducedMotion ? 0 : Math.sin(state.elapsed * 4 + index) * 2; rect(spark.x - 3, spark.y - 7 + bob, 6, 14, '#f4d474'); rect(spark.x - 7, spark.y - 3 + bob, 14, 6, '#f4d474'); rect(spark.x - 2, spark.y - 2 + bob, 4, 4, '#fff2b2'); });
    state.targets.forEach(drawPickup);
    [...state.enemies.map(body => ({ body, enemy: true })), { body: state.player, enemy: false }].sort((a, b) => a.body.y - b.body.y).forEach(entry => drawRobot(entry.body, entry.enemy));
    if (id === 'sensors') {
      const visibility = state.upgrades.includes('sensors') ? 235 : 175;
      const fog = ctx.createRadialGradient(state.player.x, state.player.y, 75, state.player.x, state.player.y, state.pulse > 0 ? state.scanRange + 80 : visibility);
      fog.addColorStop(0, 'rgba(13,33,40,0)');
      fog.addColorStop(1, 'rgba(13,33,40,0.68)');
      ctx.fillStyle = fog; ctx.fillRect(0, 0, ARENA.width, ARENA.height);
    }
    if (state.pulse > 0 && !reducedMotion) { const radius = (1 - state.pulse / .65) * state.scanRange; strokeCircle(state.player.x, state.player.y, radius, id === 'power' ? '#d3f8a0aa' : '#76dcc9aa', 4); }
    if (state.dash > 0 && !reducedMotion) { for (let i = 1; i <= 4; i++) rect(state.player.x - state.player.dx * 12 * i - 4, state.player.y - state.player.dy * 12 * i - 4, 8, 8, `rgba(245,219,139,${.6 - i * .11})`); }
    for (const particle of particles) rect(particle.x, particle.y, particle.size, particle.size, particle.color);
    for (const floater of floaters) { ctx.globalAlpha = Math.min(1, floater.life * 1.5); text(floater.text, floater.x + 2, floater.y + 2, 16, '#334247', 'center'); text(floater.text, floater.x, floater.y, 16, floater.color, 'center'); } ctx.globalAlpha = 1;
    ctx.restore();
  }

  function processEvents() {
    for (const event of state.events.splice(0)) {
      if (event.type === 'pickup' || event.type === 'deliver' || event.type === 'stun' || event.type === 'hurt') {
        playSound(event.type === 'hurt' ? 'click' : 'pickup');
        floaters.push({ ...event, life: 1.1, color: event.type === 'hurt' ? '#ffe4c2' : '#fff1b4' });
        if (!reducedMotion) for (let i = 0; i < 12; i++) { const angle = i * Math.PI / 6; particles.push({ x: event.x, y: event.y, vx: Math.cos(angle) * (35 + i * 3), vy: Math.sin(angle) * 60 - 20, size: 3 + i % 3, life: .45, color: event.type === 'hurt' ? '#ec8863' : ['#f7d071', '#eaf2b5', '#6bbd9f'][i % 3] }); }
      }
      if (event.type === 'win') playSound('success');
    }
  }

  function animate(timestamp) {
    if (disposed) return;
    const dt = previousTime ? Math.min(.04, Math.max(0, (timestamp - previousTime) / 1000)) : 0;
    previousTime = timestamp;
    const directions = new Set(pressedPointers.values());
    let x = (keys.has('ArrowRight') || keys.has('d') || directions.has('right') ? 1 : 0) - (keys.has('ArrowLeft') || keys.has('a') || directions.has('left') ? 1 : 0);
    let y = (keys.has('ArrowDown') || keys.has('s') || directions.has('down') ? 1 : 0) - (keys.has('ArrowUp') || keys.has('w') || directions.has('up') ? 1 : 0);
    if (nudge) { x += nudge.x; y += nudge.y; nudge.remaining -= dt; if (nudge.remaining <= 0) nudge = null; }
    tickArcade(state, { x, y }, dt);
    processEvents();
    if (state.mode === 'playing') {
      for (const particle of particles) { particle.life -= dt; particle.x += particle.vx * dt; particle.y += particle.vy * dt; particle.vy += 90 * dt; }
      particles = particles.filter(particle => particle.life > 0);
      for (const floater of floaters) { floater.life -= dt; if (!reducedMotion) floater.y -= 32 * dt; }
      floaters = floaters.filter(floater => floater.life > 0);
    }
    updateHud(); drawWorld(); setOverlay();
    frameId = requestAnimationFrame(animate);
  }

  updateHud(); drawWorld(); setOverlay();
  frameId = requestAnimationFrame(animate);
  return () => {
    disposed = true; clearInput(); cancelAnimationFrame(frameId);
    shell.removeEventListener('click', onClick); shell.removeEventListener('keydown', onKeyDown);
    shell.removeEventListener('pointerdown', onPointerDown); shell.removeEventListener('pointerup', onPointerUp); shell.removeEventListener('pointercancel', onPointerUp);
    window.removeEventListener('keyup', onKeyUp); window.removeEventListener('blur', autoPause); document.removeEventListener('visibilitychange', onVisibility);
  };
}
