/** Small deterministic arcade simulation. Illustrative classroom model only. */
export const ARENA = Object.freeze({ width: 960, height: 540, dock: { x: 100, y: 450, radius: 45 } });
export const BENCHES = Object.freeze([
  { x: 230, y: 160, w: 150, h: 48 },
  { x: 590, y: 160, w: 150, h: 48 },
  { x: 430, y: 320, w: 120, h: 48 },
]);
export const ARCADE_MISSIONS = Object.freeze({
  sensors: { title: 'The great chip hunt', verb: 'SCAN', special: 'Scanner pulse', instruction: 'Scan to reveal 4 hidden chips. Grab them, dodge scrapbots, then get back to your dock.', lesson: 'Sensors give robots information about their surroundings.', part: 'Distance sensor', targets: [[160, 110], [800, 105], [785, 420], [310, 420]] },
  motors: { title: 'Full throttle!', verb: 'TURBO', special: 'Turbo dash', instruction: 'Grab all 4 gears. Turbo through scrapbots to stun them, then race back to the dock.', lesson: 'Motors turn electrical energy into motion. Wheel control changes how a rover moves.', part: 'Wheel motors', targets: [[160, 110], [800, 105], [785, 420], [500, 250]] },
  controllers: { title: 'Follow the sequence', verb: 'PULSE', special: 'Freeze pulse', instruction: 'Visit checkpoints 1 → 2 → 3 → 4 in order. Pulse to freeze nearby scrapbots. Return to the dock.', lesson: 'Controllers execute instructions in a sequence. The order changes the outcome.', part: 'Controller board', targets: [[160, 110], [800, 105], [785, 420], [310, 420]] },
  power: { title: 'Power up the workshop', verb: 'SHIELD', special: 'Energy shield', instruction: 'Carry a cell to each of 3 charging stations. You can carry one cell at a time. Then return to the dock.', lesson: 'Batteries store energy. A robot needs an appropriate power supply to run its components.', part: 'Battery pack', targets: [[175, 105], [800, 110], [780, 420]] },
});

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const emit = (state, type, text, x = state.player.x, y = state.player.y) => state.events.push({ type, text, x, y });

export function createArcadeState(id, unlockedParts = []) {
  if (!ARCADE_MISSIONS[id]) throw new Error(`Unknown arcade mission: ${id}`);
  const upgrades = ['sensors', 'motors', 'controllers', 'power'].filter(part => unlockedParts.includes(part));
  const maxHealth = upgrades.includes('power') ? 5 : 4;
  return {
    id, mode: 'ready', elapsed: 0, upgrades, maxHealth, health: maxHealth, score: 0, combo: 0, comboTimer: 0, claimed: false,
    player: { x: 100, y: 450, radius: 15, dx: 0, dy: -1, moving: false },
    invulnerable: 0, shield: 0, dash: 0, cooldown: 0, pulse: 0, shake: 0, collected: 0, carrying: false,
    targets: ARCADE_MISSIONS[id].targets.map(([x, y], index) => ({ x, y, index, taken: false, revealed: id !== 'sensors' })),
    stations: [{ x: 315, y: 435, charged: false }, { x: 490, y: 105, charged: false }, { x: 600, y: 425, charged: false }],
    sparks: [[130, 285], [450, 80], [840, 280], [610, 270], [350, 280], [670, 470], [400, 440], [825, 165]].map(([x, y]) => ({ x, y, taken: false })),
    enemies: [{ x: 455, y: 135, phase: 0 }, { x: 780, y: 325, phase: 2 }, { x: 435, y: 435, phase: 4 }].map(enemy => ({ ...enemy, radius: 15, stunned: 0 })),
    message: 'Your workshop adventure starts here.', messageTimer: 0, events: [],
    speed: upgrades.includes('motors') ? 216 : 180,
    scanRange: upgrades.includes('sensors') ? 365 : 255,
    cooldownFactor: upgrades.includes('controllers') ? 0.7 : 1,
  };
}

export function startArcade(state) {
  if (state.mode !== 'ready') return false;
  state.mode = 'playing';
  state.message = ARCADE_MISSIONS[state.id].instruction;
  state.messageTimer = 6;
  return true;
}

export function pauseArcade(state) {
  if (state.mode === 'playing') { state.mode = 'paused'; return true; }
  if (state.mode === 'paused') { state.mode = 'playing'; return true; }
  return false;
}

export function objectiveComplete(state) {
  return state.id === 'power' ? state.stations.every(station => station.charged) : state.collected === state.targets.length;
}

export function missionProgress(state) {
  if (objectiveComplete(state)) return 'Return to your dock!';
  if (state.id === 'sensors') return `Chips found ${state.collected} / 4 · scan to reveal`;
  if (state.id === 'motors') return `Gears collected ${state.collected} / 4`;
  if (state.id === 'controllers') return `Next checkpoint ${state.collected + 1} / 4`;
  return `Stations charged ${state.stations.filter(station => station.charged).length} / 3${state.carrying ? ' · carrying a cell!' : ' · find an energy cell'}`;
}

function addScore(state, base, combo = true) {
  if (combo) { state.combo = state.comboTimer > 0 ? Math.min(4, state.combo + 1) : 1; state.comboTimer = 7; }
  const multiplier = combo ? state.combo : 1;
  const award = Math.round(base * multiplier * (state.upgrades.includes('controllers') ? 1.25 : 1));
  state.score += award;
  return award;
}

function say(state, text, duration = 3) { state.message = text; state.messageTimer = duration; }

export function activateAbility(state) {
  if (state.mode !== 'playing' || state.cooldown > 0) return false;
  state.cooldown = (state.id === 'power' ? 4 : state.id === 'controllers' ? 3.8 : 2) * state.cooldownFactor;
  state.pulse = 0.65;
  if (state.id === 'sensors') {
    let count = 0;
    for (const target of state.targets) if (!target.taken && dist(target, state.player) <= state.scanRange) { if (!target.revealed) count += 1; target.revealed = true; }
    say(state, count ? `${count} hidden chip${count === 1 ? '' : 's'} revealed! Go get it!` : 'Scan complete. Try the other side of the workshop.');
    for (const enemy of state.enemies) if (dist(enemy, state.player) < state.scanRange) enemy.stunned = Math.max(enemy.stunned, 0.7);
  } else if (state.id === 'motors') {
    state.dash = 0.28;
    state.invulnerable = Math.max(state.invulnerable, 0.35);
    say(state, 'TURBO! Dash into a scrapbot to stun it.', 1.6);
  } else if (state.id === 'controllers') {
    for (const enemy of state.enemies) if (dist(enemy, state.player) < state.scanRange) enemy.stunned = 2.8;
    say(state, 'FREEZE! Nearby scrapbots paused. Follow the numbers.');
  } else {
    state.shield = 2.5;
    say(state, 'SHIELD ON! Carry that energy home.', 2.5);
  }
  emit(state, 'ability', ARCADE_MISSIONS[state.id].verb);
  return true;
}

function blocked(x, y, radius) {
  if (x < 38 + radius || x > ARENA.width - 38 - radius || y < 53 + radius || y > ARENA.height - 30 - radius) return true;
  return BENCHES.some(rect => {
    const closeX = Math.max(rect.x, Math.min(x, rect.x + rect.w));
    const closeY = Math.max(rect.y, Math.min(y, rect.y + rect.h));
    return Math.hypot(x - closeX, y - closeY) < radius;
  });
}

function move(body, dx, dy) {
  let moved = false;
  if (!blocked(body.x + dx, body.y, body.radius)) { body.x += dx; moved ||= dx !== 0; }
  if (!blocked(body.x, body.y + dy, body.radius)) { body.y += dy; moved ||= dy !== 0; }
  return moved;
}

export function damagePlayer(state) {
  if (state.mode !== 'playing' || state.invulnerable > 0 || state.shield > 0 || state.dash > 0) return false;
  state.health = Math.max(0, state.health - 1);
  state.invulnerable = 2;
  state.shake = 0.18;
  state.combo = 0;
  state.comboTimer = 0;
  emit(state, 'hurt', 'OUCH!');
  say(state, 'Scrapbot bump! Keep moving. Your parts are safe.', 2);
  if (state.health === 0) { state.mode = 'lost'; emit(state, 'lost', 'Try again?'); }
  return true;
}

export function tickArcade(state, input = {}, delta = 0) {
  if (state.mode !== 'playing') return;
  const dt = Math.max(0, Math.min(0.05, Number.isFinite(delta) ? delta : 0));
  state.elapsed += dt;
  for (const key of ['invulnerable', 'shield', 'dash', 'cooldown', 'pulse', 'shake', 'comboTimer', 'messageTimer']) state[key] = Math.max(0, state[key] - dt);
  if (!state.comboTimer) state.combo = 0;
  let x = Number.isFinite(input.x) ? input.x : 0;
  let y = Number.isFinite(input.y) ? input.y : 0;
  const length = Math.hypot(x, y);
  if (length > 1) { x /= length; y /= length; }
  if (length > 0) { state.player.dx = x; state.player.dy = y; }
  const speed = state.dash > 0 ? 630 : state.speed * (state.carrying ? 0.84 : 1);
  state.player.moving = move(state.player, (state.dash > 0 ? state.player.dx : x) * speed * dt, (state.dash > 0 ? state.player.dy : y) * speed * dt);
  for (const enemy of state.enemies) {
    enemy.stunned = Math.max(0, enemy.stunned - dt);
    if (enemy.stunned > 0) continue;
    const range = dist(enemy, state.player);
    const chase = range < 215;
    let ex = chase ? (state.player.x - enemy.x) / (range || 1) : Math.cos(state.elapsed * 0.65 + enemy.phase);
    let ey = chase ? (state.player.y - enemy.y) / (range || 1) : Math.sin(state.elapsed * 0.48 + enemy.phase);
    if (!move(enemy, ex * 78 * dt, ey * 78 * dt)) move(enemy, -ey * 78 * dt, ex * 78 * dt);
    if (dist(enemy, state.player) < enemy.radius + state.player.radius) {
      if (state.dash > 0) { enemy.stunned = 3; const score = addScore(state, 80, false); emit(state, 'stun', `BONK! +${score}`, enemy.x, enemy.y); }
      else { if (damagePlayer(state)) move(state.player, -ex * 25, -ey * 25); }
    }
  }
  if (state.mode !== 'playing') return;
  for (const spark of state.sparks) if (!spark.taken && dist(spark, state.player) < 25) { spark.taken = true; const score = addScore(state, 20); emit(state, 'pickup', `+${score}`, spark.x, spark.y); }
  for (const target of state.targets) {
    if (target.taken || !target.revealed || dist(target, state.player) >= 30) continue;
    if (state.id === 'controllers' && target.index !== state.collected) {
      if (state.messageTimer < 1) say(state, `Sequence first! Find checkpoint ${state.collected + 1}.`, 1.5);
      continue;
    }
    if (state.id === 'power' && state.carrying) continue;
    target.taken = true;
    if (state.id === 'power') { state.carrying = true; say(state, 'Cell collected! Take it to an unlit charging station.'); }
    else { state.collected += 1; say(state, state.id === 'controllers' ? `Checkpoint ${state.collected} complete! ${state.collected < 4 ? `Next: ${state.collected + 1}.` : 'Back to the dock!'}` : `${state.collected} / 4 parts! ${state.collected === 4 ? 'Return to your dock!' : 'Keep going!'}`); }
    const score = addScore(state, 100);
    emit(state, 'pickup', `+${score}`, target.x, target.y);
  }
  if (state.id === 'power' && state.carrying) for (const station of state.stations) {
    if (!station.charged && dist(station, state.player) < 40) {
      station.charged = true;
      state.carrying = false;
      state.collected += 1;
      const score = addScore(state, 150);
      emit(state, 'deliver', `POWER ON! +${score}`, station.x, station.y);
      say(state, state.collected === 3 ? 'Every station is powered! Return to the dock.' : `${state.collected} / 3 stations online! Find another cell.`);
      break;
    }
  }
  if (objectiveComplete(state) && dist(state.player, ARENA.dock) < ARENA.dock.radius) {
    state.mode = 'won';
    state.score += state.health * 100;
    emit(state, 'win', 'MISSION COMPLETE!');
  }
}

export function claimArcadeReward(state) {
  if (state.mode !== 'won' || state.claimed) return false;
  state.claimed = true;
  return true;
}
