/** Deterministic classroom models, not predictions of physical hardware. */
export const SENSOR_ROUNDS = Object.freeze([
  Object.freeze([28, 180, 42]),
  Object.freeze([160, 33, 47]),
  Object.freeze([35, 46, 190]),
  Object.freeze([24, 175, 39]),
]);

export function checkSensorRoute(round, lane, scanned) {
  if (!Number.isInteger(round) || !SENSOR_ROUNDS[round] || !Number.isInteger(lane) || lane < 0 || lane > 2) {
    return { ok: false, message: 'Choose one of the three marked lanes.' };
  }
  if (!scanned) return { ok: false, message: 'Scan first. The sensor gives your controller information about the path.' };
  const distance = SENSOR_ROUNDS[round][lane];
  if (distance < 60) return { ok: false, message: `Obstacle at ${distance} cm. Choose a lane with more room.` };
  return { ok: true, complete: round === SENSOR_ROUNDS.length - 1, nextRound: round + 1, message: 'Clear path! Your sensor helped the robot choose a route.' };
}

export function wheelMotion(left, right) {
  if (![left, right].every(v => Number.isInteger(v) && v >= -1 && v <= 1)) return 'invalid';
  if (left === right) return left === 0 ? 'stop' : left > 0 ? 'forward' : 'reverse';
  return left < right ? 'left' : 'right';
}

export const MOTOR_TARGETS = Object.freeze(['forward', 'left', 'right']);
export function checkMotorTarget(stage, left, right) {
  const motion = wheelMotion(left, right);
  return { ok: Boolean(MOTOR_TARGETS[stage]) && motion === MOTOR_TARGETS[stage], motion, complete: stage === MOTOR_TARGETS.length - 1 && motion === MOTOR_TARGETS[stage] };
}

export const CONTROLLER_GRID = Object.freeze({
  width: 5,
  height: 4,
  start: Object.freeze({ x: 0, y: 3, direction: 0 }),
  goal: Object.freeze({ x: 4, y: 0 }),
  walls: Object.freeze(['1,3', '1,2', '3,1', '3,2']),
});

export function runProgram(commands) {
  let position = { ...CONTROLLER_GRID.start };
  const trace = [{ ...position }];
  if (!Array.isArray(commands) || !commands.length) return { success: false, reason: 'Add a few commands before running your program.', position, trace };
  if (commands.length > 20) return { success: false, reason: 'Keep your program to 20 commands or fewer.', position, trace };
  for (let index = 0; index < commands.length; index += 1) {
    const command = commands[index];
    if (!['F', 'L', 'R'].includes(command)) return { success: false, reason: `Unknown command at step ${index + 1}.`, position, trace };
    if (command === 'L') position = { ...position, direction: (position.direction + 3) % 4 };
    if (command === 'R') position = { ...position, direction: (position.direction + 1) % 4 };
    if (command === 'F') {
      const [dx, dy] = [[0, -1], [1, 0], [0, 1], [-1, 0]][position.direction];
      const next = { ...position, x: position.x + dx, y: position.y + dy };
      if (next.x < 0 || next.x >= CONTROLLER_GRID.width || next.y < 0 || next.y >= CONTROLLER_GRID.height || CONTROLLER_GRID.walls.includes(`${next.x},${next.y}`)) {
        return { success: false, reason: `Step ${index + 1} meets an obstacle. Edit your route and try again.`, position, trace };
      }
      position = next;
    }
    trace.push({ ...position });
  }
  const success = position.x === CONTROLLER_GRID.goal.x && position.y === CONTROLLER_GRID.goal.y;
  return { success, reason: success ? 'Program complete. Rover delivered!' : 'The program finished before reaching the star. Add or edit commands.', position, trace };
}

export const INITIAL_POWER_TILES = Object.freeze([
  { x: 0, y: 0, kind: 'battery', shape: 'corner', rotation: 0 },
  { x: 1, y: 0, kind: 'wire', shape: 'straight', rotation: 0 },
  { x: 2, y: 0, kind: 'wire', shape: 'corner', rotation: 0 },
  { x: 2, y: 1, kind: 'wire', shape: 'straight', rotation: 1 },
  { x: 2, y: 2, kind: 'motor', shape: 'corner', rotation: 0 },
  { x: 1, y: 2, kind: 'wire', shape: 'straight', rotation: 0 },
  { x: 0, y: 2, kind: 'wire', shape: 'corner', rotation: 1 },
  { x: 0, y: 1, kind: 'wire', shape: 'straight', rotation: 1 },
].map(Object.freeze));

export function tileConnections(tile) {
  if (tile.kind === 'battery') return [1, 2];
  if (tile.kind === 'motor') return [0, 3];
  const base = tile.shape === 'straight' ? [0, 2] : [0, 1];
  return base.map(direction => (direction + tile.rotation % 4 + 4) % 4);
}

export function rotatePowerTile(tiles, index) {
  return tiles.map((tile, i) => i === index && tile.kind === 'wire' ? { ...tile, rotation: (tile.rotation + 1) % 4 } : { ...tile });
}

export function isPowerCircuitClosed(tiles) {
  if (!Array.isArray(tiles) || tiles.length !== 8 || tiles.filter(t => t.kind === 'battery').length !== 1 || tiles.filter(t => t.kind === 'motor').length !== 1) return false;
  const positions = new Map(tiles.map(tile => [`${tile.x},${tile.y}`, tile]));
  if (positions.size !== tiles.length) return false;
  const battery = tiles.find(tile => tile.kind === 'battery');
  const visited = new Set();
  const pending = [battery];
  while (pending.length) {
    const tile = pending.pop();
    const key = `${tile.x},${tile.y}`;
    if (visited.has(key)) continue;
    visited.add(key);
    for (const direction of tileConnections(tile)) {
      const [dx, dy] = [[0, -1], [1, 0], [0, 1], [-1, 0]][direction];
      const next = positions.get(`${tile.x + dx},${tile.y + dy}`);
      if (!next || !tileConnections(next).includes((direction + 2) % 4)) return false;
      pending.push(next);
    }
  }
  return visited.size === tiles.length;
}
