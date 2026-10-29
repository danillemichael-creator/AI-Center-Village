import { SENSOR_ROUNDS, checkSensorRoute, checkMotorTarget, runProgram, CONTROLLER_GRID, INITIAL_POWER_TILES, rotatePowerTile, tileConnections, isPowerCircuitClosed } from './model.js';

const robot = `<svg viewBox="0 0 80 80" aria-hidden="true"><path fill="#243445" d="M17 39h46v27H17zM8 50h12v24H8zM60 50h12v24H60zM21 10h38v30H21zM38 2h4v10h-4z"/><path fill="#eaa83c" d="M24 13h32v23H24zM21 43h38v19H21z"/><path fill="#fff0ce" d="M29 19h8v9h-8zM44 19h8v9h-8z"/><path fill="#138c84" d="M29 48h23v6H29z"/><path fill="#667b83" d="M11 54h6v15h-6zM63 54h6v15h-6z"/></svg>`;
const facts = {
  sensors: { name: 'Distance sensor', line: 'Sensors measure the world. A controller uses those readings to decide what the robot does next.', part: 'A new set of senses' },
  motors: { name: 'Wheel motors', line: 'Motors create movement. Different speeds at the left and right wheels can steer a two-wheel robot.', part: 'Ready to roll' },
  controllers: { name: 'Controller board', line: 'A controller follows a program, step by step, to tell a robot what to do.', part: 'A little robot brain' },
  power: { name: 'Battery pack', line: 'A battery supplies electrical energy. Current needs a complete conducting path through the load and back to the battery.', part: 'Powered by possibility' },
};

const dots = (current, total) => `<div class="game-progress" aria-label="${current} of ${total} stages complete">${Array.from({ length: total }, (_, i) => `<span class="${i < current ? 'game-dot-done' : ''}"></span>`).join('')}<small>${current} / ${total}</small></div>`;
const status = (message, good = false) => `<div class="game-feedback ${good ? 'game-feedback-good' : ''}" role="status">${message}</div>`;

/** Mount a challenge in an existing dialog. Completion is claimed only after a win. */
export function mountChallenge(id, container, { onComplete = () => {}, playSound = () => {} } = {}) {
  if (!facts[id]) throw new Error(`Unknown robotics challenge: ${id}`);
  let disposed = false;
  let completed = false;
  let claimed = false;
  let round = 0;
  let scanned = false;
  let message = '';
  let good = false;
  let left = 0;
  let right = 0;
  let lastMotion = 'stop';
  let program = [];
  let result = null;
  let hint = false;
  let tiles = INITIAL_POWER_TILES.map(tile => ({ ...tile }));

  function paint(markup, preferredFocus) {
    const focusKey = preferredFocus || (container.contains(document.activeElement) ? document.activeElement.dataset.focus : null);
    container.innerHTML = markup;
    if (focusKey) container.querySelector(`[data-focus="${focusKey}"]`)?.focus({ preventScroll: true });
  }

  function frame(content) {
    return `<div class="game-content">${content}<p class="game-model-note">CLASSROOM MODEL · Try, observe, improve. No timer. No lost lives.</p></div>`;
  }

  function win() {
    completed = true;
    playSound('success');
    const fact = facts[id];
    paint(frame(`<section class="game-win"><span class="game-eyebrow">CHALLENGE COMPLETE</span><div class="game-win-robot">${robot}</div><h3>${fact.part}</h3><p>${fact.line}</p><div class="game-part-earned"><span>PART EARNED</span><strong>${fact.name}</strong></div><button class="game-primary" data-action="claim" data-focus="claim">Add to my robot <span aria-hidden="true">→</span></button><small>Back to workshop</small></section>`), 'claim');
  }

  function renderSensors() {
    const readings = SENSOR_ROUNDS[round];
    paint(frame(`<div class="game-intro"><div><span class="game-eyebrow">01 / SENSE THE WORLD</span><h3>Find the clear path.</h3><p>Scan the three lanes, then drive into one with at least <strong>60 cm</strong> of clear space.</p></div>${dots(round, SENSOR_ROUNDS.length)}</div>
      <div class="game-sensor-field ${scanned ? 'game-field-scanned' : ''}"><div class="game-sensor-horizon"><span>TEST TRACK</span><span>SECTOR 0${round + 1}</span></div><div class="game-lanes">${readings.map((distance, lane) => `<div class="game-lane"><div class="game-reading">${scanned ? `<strong>${distance}</strong> cm` : '??? cm'}</div><div class="game-lane-ground"><div class="game-crate ${scanned ? 'game-crate-visible' : ''} ${distance >= 60 ? 'game-crate-far' : ''}"><span>×</span></div><div class="game-path-dashes"></div></div><span class="game-lane-label">LANE ${lane + 1}</span></div>`).join('')}</div><div class="game-scan-rover">${robot}${scanned ? '<div class="game-scan-wave"></div>' : ''}</div></div>
      <div class="game-action-row"><button class="game-primary" data-action="scan" data-focus="scan"><span aria-hidden="true">◎</span> ${scanned ? 'Scan again' : 'Scan lanes'}</button><span class="game-helper">Read the distance.<br>More room = a clearer route.</span></div>
      <div class="game-lane-controls">${[0, 1, 2].map(lane => `<button class="game-secondary" data-action="drive" data-lane="${lane}" data-focus="lane-${lane}">Drive lane ${lane + 1} <span aria-hidden="true">↑</span></button>`).join('')}</div>
      ${status(message || 'Your sensor has not scanned this sector yet.', good)}`));
  }

  function renderMotors() {
    const targets = [{ text: 'Drive forward', icon: '↑', instruction: 'Make both wheels turn forward at the same speed.' }, { text: 'Turn left', icon: '↶', instruction: 'Make the right wheel move faster than the left wheel.' }, { text: 'Turn right', icon: '↷', instruction: 'Make the left wheel move faster than the right wheel.' }];
    const target = targets[round];
    const wheelPanel = (name, value) => `<fieldset class="game-wheel-panel"><legend>${name.toUpperCase()} WHEEL</legend><div class="game-wheel-tread ${value === 0 ? '' : 'game-wheel-on'}"><i></i><i></i><i></i><i></i></div><div class="game-wheel-options">${[[-1, 'Reverse', '↓'], [0, 'Stop', '■'], [1, 'Forward', '↑']].map(([speed, label, icon]) => `<button class="game-option ${value === speed ? 'game-option-selected' : ''}" aria-pressed="${value === speed}" aria-label="${name} wheel ${label.toLowerCase()}" data-action="wheel" data-wheel="${name}" data-speed="${speed}" data-focus="${name}-${speed}"><span aria-hidden="true">${icon}</span>${label}</button>`).join('')}</div></fieldset>`;
    paint(frame(`<div class="game-intro"><div><span class="game-eyebrow">02 / MAKE IT MOVE</span><h3>Two wheels. One team.</h3><p>Choose a direction for each motor, then test your rover.</p></div>${dots(round, 3)}</div><div class="game-target"><span>YOUR TARGET</span><strong><b aria-hidden="true">${target.icon}</b> ${target.text}</strong><small>${target.instruction}</small></div><div class="game-motor-bench">${wheelPanel('Left', left)}<div class="game-motor-rover"><div class="game-motor-rover-art game-rover-${lastMotion}">${robot}</div><span>FRONT ↑</span></div>${wheelPanel('Right', right)}</div><button class="game-primary game-wide" data-action="test-motors" data-focus="test-motors">Test motors <span aria-hidden="true">▶</span></button>${status(message || 'The motors are stopped. Set the wheels to match the target.', good)}<p class="game-detail">This two-wheel drive model assumes the wheels grip the floor. Real robots also need a suitable motor driver.</p>`));
  }

  function renderControllers() {
    const position = result?.position || CONTROLLER_GRID.start;
    const visited = new Set((result?.trace || []).map(p => `${p.x},${p.y}`));
    paint(frame(`<div class="game-intro"><div><span class="game-eyebrow">03 / THINK IN STEPS</span><h3>Program a delivery.</h3><p>Get the rover to the star. It starts facing up. Turns change its direction, not its position.</p></div><button class="game-text-button" data-action="hint" data-focus="hint">${hint ? 'Hide hint' : 'Need a hint?'}</button></div>${hint ? '<div class="game-hint">Try heading up to the top row first. Then turn toward the star. You can reach it in 8 commands.</div>' : ''}<div class="game-controller-layout"><div class="game-grid" role="img" aria-label="Five-column, four-row track. Rover starts bottom left facing north. Goal is top right. Obstacles at column 2 rows 3 and 4, column 4 rows 2 and 3.">${Array.from({ length: 20 }, (_, i) => { const x = i % 5, y = Math.floor(i / 5), key = `${x},${y}`; const isRover = x === position.x && y === position.y; const isGoal = x === 4 && y === 0; const wall = CONTROLLER_GRID.walls.includes(key); return `<div class="game-grid-cell ${wall ? 'game-grid-wall' : ''} ${visited.has(key) ? 'game-grid-visited' : ''} ${isGoal ? 'game-grid-goal' : ''}">${isRover ? `<span class="game-grid-rover" style="transform:rotate(${position.direction * 90}deg)">↑</span>` : wall ? '<span aria-hidden="true">▧</span>' : isGoal ? '<span aria-hidden="true">★</span>' : visited.has(key) ? '<span class="game-route-dot"></span>' : ''}</div>`; }).join('')}</div><div class="game-code-panel"><span class="game-eyebrow">YOUR PROGRAM <b>${program.length}/20</b></span><div class="game-program" aria-label="Queued commands">${program.length ? program.map((command, i) => `<span class="game-code-chip"><small>${i + 1}</small>${{ F: '↑', L: '↶', R: '↷' }[command]}</span>`).join('') : '<p>Add commands below.<br>The rover follows them in order.</p>'}</div><div class="game-code-edit"><button class="game-text-button" data-action="undo" data-focus="undo" ${program.length ? '' : 'disabled'}>↶ Undo</button><button class="game-text-button" data-action="clear" data-focus="clear" ${program.length ? '' : 'disabled'}>Clear all</button></div></div></div><div class="game-command-buttons"><button class="game-secondary" data-action="command" data-command="F" data-focus="forward">↑ Forward</button><button class="game-secondary" data-action="command" data-command="L" data-focus="left">↶ Turn left</button><button class="game-secondary" data-action="command" data-command="R" data-focus="right">↷ Turn right</button></div><button class="game-primary game-wide" data-action="run" data-focus="run">Run program <span aria-hidden="true">▶</span></button>${status(message || 'Plan a route, then add your commands. Every run starts from the beginning.', good)}`));
  }

  function wireSvg(tile) {
    const coordinates = ['50,0', '100,50', '50,100', '0,50'];
    const lines = tileConnections(tile).map(direction => `<polyline points="${coordinates[direction]} 50,50"/>`).join('');
    const icon = tile.kind === 'battery' ? '<rect x="30" y="28" width="40" height="44" rx="3"/><path d="M44 28v-6h12v6"/><path class="game-wire-symbol" d="M45 39h10v10h-10zM50 39v10"/>' : tile.kind === 'motor' ? '<circle cx="50" cy="50" r="24"/><text x="50" y="59" text-anchor="middle">M</text>' : '<circle cx="50" cy="50" r="5"/>';
    return `<svg viewBox="0 0 100 100" aria-hidden="true"><g class="game-wire-lines">${lines}</g><g class="game-wire-device">${icon}</g></svg>`;
  }

  function renderPower() {
    const names = ['battery', 'top center', 'top right', 'middle right', 'motor', 'bottom center', 'bottom left', 'middle left'];
    paint(frame(`<div class="game-intro"><div><span class="game-eyebrow">04 / CLOSE THE LOOP</span><h3>Bring the circuit to life.</h3><p>Rotate the six wire tiles to make a complete loop through the battery and motor.</p></div><span class="game-circuit-state">○ OPEN CIRCUIT</span></div><div class="game-power-layout"><div class="game-power-grid">${Array.from({ length: 9 }, (_, cell) => { const index = tiles.findIndex(tile => tile.x === cell % 3 && tile.y === Math.floor(cell / 3)); if (index < 0) return '<div class="game-circuit-center"><span>+</span><strong>MAKE A<br>COMPLETE<br>LOOP</strong><span>−</span></div>'; const tile = tiles[index]; return tile.kind === 'wire' ? `<button class="game-power-tile" data-action="rotate" data-index="${index}" data-focus="tile-${index}" aria-label="Rotate ${names[index]} wire clockwise. Connections ${tileConnections(tile).map(d => ['up', 'right', 'down', 'left'][d]).join(' and ')}">${wireSvg(tile)}<small aria-hidden="true">↻</small></button>` : `<div class="game-power-tile game-fixed-tile" aria-label="${tile.kind === 'battery' ? 'Battery, energy source' : 'Motor, electrical load'}">${wireSvg(tile)}<small>${tile.kind.toUpperCase()}</small></div>`; }).join('')}</div><aside class="game-power-legend"><div><span class="game-legend-number">01</span><strong>Rotate</strong><p>Tap a wire to turn it clockwise.</p></div><div><span class="game-legend-number">02</span><strong>Connect</strong><p>Every wire end must meet the next tile.</p></div><div><span class="game-legend-number">03</span><strong>Return</strong><p>Trace a loop from the battery, through the motor, and back.</p></div></aside></div><div class="game-action-row"><button class="game-primary" data-action="test-power" data-focus="test-power">Test circuit <span aria-hidden="true">ϟ</span></button><button class="game-text-button" data-action="reset-power" data-focus="reset-power">Reset wires</button></div>${status(message || 'The battery and motor stay in place. The wire tiles are yours to fix.', good)}<p class="game-detail">Simplified circuit model. For physical builds, use rated components and a suitable motor driver.</p>`));
  }

  const renders = { sensors: renderSensors, motors: renderMotors, controllers: renderControllers, power: renderPower };
  function render() { if (!disposed) renders[id](); }

  function onClick(event) {
    const button = event.target.closest('button[data-action]');
    if (!button || !container.contains(button) || disposed) return;
    const action = button.dataset.action;
    if (action === 'claim') {
      if (completed && !claimed) { claimed = true; onComplete(id); }
      return;
    }
    if (completed) return;
    playSound('click');
    good = false;
    if (action === 'scan') {
      scanned = true;
      message = 'Scan received. Compare the three readings and choose a clear lane.';
    } else if (action === 'drive') {
      const outcome = checkSensorRoute(round, Number(button.dataset.lane), scanned);
      message = outcome.message;
      good = outcome.ok;
      if (outcome.complete) return win();
      if (outcome.ok) { round = outcome.nextRound; scanned = false; }
    } else if (action === 'wheel') {
      if (button.dataset.wheel === 'Left') left = Number(button.dataset.speed);
      else right = Number(button.dataset.speed);
    } else if (action === 'test-motors') {
      const outcome = checkMotorTarget(round, left, right);
      lastMotion = outcome.motion;
      good = outcome.ok;
      if (outcome.complete) return win();
      if (outcome.ok) {
        message = `Good driving! The rover moved ${outcome.motion === 'forward' ? 'forward' : `to the ${outcome.motion}`}. Now try the next target.`;
        round += 1;
        left = 0;
        right = 0;
      } else {
        message = `The rover ${outcome.motion === 'stop' ? 'stayed still' : outcome.motion === 'forward' ? 'went forward' : outcome.motion === 'reverse' ? 'went backward' : `turned ${outcome.motion}`}. Change the wheel settings to match the target.`;
      }
    } else if (action === 'command') {
      if (program.length < 20) { program.push(button.dataset.command); result = null; message = 'Command added. Every run starts from the bottom-left square.'; }
      else message = 'Your program has 20 commands. Undo or clear a step to make room.';
    } else if (action === 'undo') {
      program.pop(); result = null; message = 'Last command removed.';
    } else if (action === 'clear') {
      program = []; result = null; message = 'Fresh start. Build a new route.';
    } else if (action === 'run') {
      result = runProgram(program);
      message = result.reason;
      if (result.success) return win();
    } else if (action === 'hint') {
      hint = !hint;
    } else if (action === 'rotate') {
      tiles = rotatePowerTile(tiles, Number(button.dataset.index));
      message = 'Wire rotated. Keep tracing your loop, then test the circuit.';
    } else if (action === 'reset-power') {
      tiles = INITIAL_POWER_TILES.map(tile => ({ ...tile }));
      message = 'Wires reset. Try a new connection.';
    } else if (action === 'test-power') {
      if (isPowerCircuitClosed(tiles)) return win();
      message = 'The loop is still open. Check every connection, including the return path to the battery.';
    }
    render();
  }

  container.addEventListener('click', onClick);
  render();
  return () => { disposed = true; container.removeEventListener('click', onClick); };
}
