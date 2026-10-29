export const BOARD_W = 1040;
export const BOARD_H = 640;

export function edgeGeometry(
  a: { x: number; y: number },
  b: { x: number; y: number },
  bend = 0,
): { x: number; y: number; d: string } {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  if (!bend) {
    return { x: mx, y: my, d: `M ${a.x} ${a.y} L ${b.x} ${b.y}` };
  }
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const cx = mx + (-dy / len) * bend;
  const cy = my + (dx / len) * bend;
  const t = 0.5;
  const x = (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * cx + t * t * b.x;
  const y = (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * cy + t * t * b.y;
  return { x, y, d: `M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}` };
}
