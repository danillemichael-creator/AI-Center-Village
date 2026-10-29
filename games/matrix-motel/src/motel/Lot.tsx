import { useEffect, useRef, useState } from "react";

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const SOLIDS: Rect[] = [
  { x: 78, y: 90, w: 244, h: 42 },
  { x: 78, y: 132, w: 104, h: 22 },
  { x: 214, y: 132, w: 108, h: 22 },
  { x: 338, y: 108, w: 48, h: 36 },
  { x: 108, y: 206, w: 36, h: 16 },
  { x: 248, y: 204, w: 40, h: 16 },
  { x: 118, y: 168, w: 16, h: 14 },
  { x: 286, y: 168, w: 18, h: 16 },
];

function blocked(px: number, py: number) {
  return SOLIDS.some(
    (rect) => px > rect.x - 5 && px < rect.x + rect.w + 5 && py > rect.y - 5 && py < rect.y + rect.h + 5,
  );
}

function drawLot(
  ctx: CanvasRenderingContext2D,
  time: number,
  player: { x: number; y: number; moving: boolean },
) {
  ctx.imageSmoothingEnabled = false;
  const sky = ctx.createLinearGradient(0, 0, 0, 260);
  sky.addColorStop(0, "#14081f");
  sky.addColorStop(0.45, "#2a1242");
  sky.addColorStop(1, "#120c14");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 400, 260);

  const stars = [
    [18, 16],
    [48, 34],
    [90, 14],
    [140, 28],
    [210, 12],
    [300, 22],
    [340, 10],
    [370, 30],
    [250, 40],
  ];
  stars.forEach(([sx, sy], index) => {
    ctx.globalAlpha = 0.45 + 0.55 * Math.abs(Math.sin(time / 500 + index));
    ctx.fillStyle = "#ffe9ff";
    ctx.fillRect(sx ?? 0, sy ?? 0, 2, 2);
  });
  ctx.globalAlpha = 1;

  ctx.fillStyle = "#f3e2b0";
  ctx.fillRect(332, 28, 16, 16);
  ctx.fillStyle = "#2a1242";
  ctx.fillRect(338, 26, 14, 14);

  ctx.fillStyle = "#1a1030";
  const towers = [
    [8, 58, 18, 34],
    [28, 46, 14, 46],
    [46, 64, 12, 28],
    [348, 52, 16, 40],
    [368, 40, 22, 52],
  ];
  for (const tower of towers) {
    const [tx, ty, tw, th] = tower;
    ctx.fillRect(tx ?? 0, ty ?? 0, tw ?? 0, th ?? 0);
  }
  ctx.fillStyle = "#ffd56a";
  ctx.fillRect(32, 54, 2, 2);
  ctx.fillRect(34, 62, 2, 2);
  ctx.fillStyle = "#7af7ff";
  ctx.fillRect(372, 50, 2, 2);
  ctx.fillRect(376, 64, 2, 2);
  ctx.fillStyle = "#ff4fd8";
  ctx.fillRect(14, 70, 2, 2);

  ctx.fillStyle = "#1c1a22";
  ctx.fillRect(0, 228, 400, 32);
  ctx.fillStyle = "#3a3428";
  ctx.fillRect(0, 196, 400, 32);
  ctx.fillStyle = "#2a241c";
  ctx.fillRect(0, 168, 400, 28);
  ctx.fillStyle = "#c9a227";
  for (let dash = 0; dash < 400; dash += 28) ctx.fillRect(dash, 242, 12, 2);
  ctx.fillStyle = "#3a3422";
  ctx.fillRect(96, 204, 50, 22);
  ctx.fillRect(230, 202, 64, 24);

  ctx.fillStyle = "#0c3e52";
  ctx.fillRect(338, 108, 48, 36);
  ctx.fillStyle = "#7af7ff";
  const shimmer = Math.floor(time / 180) % 5;
  ctx.fillRect(346 + shimmer * 4, 116, 8, 2);
  ctx.fillRect(352, 130, 14, 2);

  ctx.fillStyle = "#24162f";
  ctx.fillRect(78, 90, 244, 42);
  ctx.fillStyle = "#3a224c";
  ctx.fillRect(78, 132, 244, 22);
  ctx.fillStyle = "#ff4fd8";
  ctx.fillRect(78, 128, 244, 3);
  ctx.fillStyle = "#39ff88";
  ctx.fillRect(82, 90, 236, 2);

  const windows = [90, 112, 134, 230, 252, 274, 296];
  windows.forEach((wx, index) => {
    const flicker = index === 2 && Math.floor(time / 280) % 3 === 0;
    ctx.fillStyle = flicker ? "#1a2030" : index % 2 === 0 ? "#ffe27a" : "#39ff88";
    ctx.fillRect(wx, 136, 12, 10);
  });

  ctx.fillStyle = "#120810";
  ctx.fillRect(182, 132, 32, 22);
  ctx.fillStyle = "#7af7ff";
  ctx.fillRect(182, 132, 32, 2);
  ctx.fillRect(182, 132, 2, 22);
  ctx.fillRect(212, 132, 2, 22);
  ctx.fillStyle = Math.floor(time / 400) % 2 === 0 ? "#39ff88" : "#145c32";
  ctx.fillRect(194, 142, 8, 4);

  drawPalm(ctx, 42, 150);
  drawPalm(ctx, 360, 188);
  drawCar(ctx, 108, 206, "#ff4fd8", 36, 16);
  drawCar(ctx, 248, 204, "#37e0ff", 40, 16);

  ctx.fillStyle = "#3a2a18";
  ctx.fillRect(118, 168, 16, 14);
  ctx.fillStyle = "#ffd56a";
  ctx.fillRect(121, 171, 10, 6);

  ctx.fillStyle = "#201628";
  ctx.fillRect(286, 168, 18, 16);
  ctx.fillStyle = "#7af7ff";
  ctx.fillRect(289, 171, 12, 8);

  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(player.x - 5, player.y + 4, 10, 3);
  const bob = player.moving ? Math.sin(time / 80) * 1 : 0;
  ctx.fillStyle = "#241833";
  ctx.fillRect(player.x - 4, player.y - 4 + bob, 8, 8);
  ctx.fillStyle = "#ff4fd8";
  ctx.fillRect(player.x - 4, player.y - 4 + bob, 8, 1);
  ctx.fillStyle = "#f0c09a";
  ctx.fillRect(player.x - 2, player.y - 7 + bob, 4, 4);
  ctx.fillStyle = "#140810";
  ctx.fillRect(player.x - 2, player.y - 7 + bob, 4, 2);
}

function drawPalm(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = "#6b4423";
  ctx.fillRect(x - 1, y - 1, 3, 8);
  ctx.fillStyle = "#1d6b3a";
  ctx.fillRect(x - 10, y - 6, 8, 5);
  ctx.fillRect(x + 3, y - 8, 8, 5);
  ctx.fillRect(x - 6, y - 12, 12, 6);
  ctx.fillStyle = "#39ff88";
  ctx.fillRect(x - 2, y - 10, 4, 3);
}

function drawCar(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, w: number, h: number) {
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.fillRect(x + 2, y + 2, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "#d7f4ff";
  ctx.fillRect(x + 4, y + 3, w - 8, 4);
  ctx.fillStyle = "#141018";
  ctx.fillRect(x + 1, y + 2, 3, 3);
  ctx.fillRect(x + w - 4, y + 2, 3, 3);
  ctx.fillRect(x + 1, y + h - 5, 3, 3);
  ctx.fillRect(x + w - 4, y + h - 5, 3, 3);
}

export function Lot({
  locked,
  onEnter,
  onKeys,
  onHelp,
  onLeave,
}: {
  locked: boolean;
  onEnter: () => void;
  onKeys: () => void;
  onHelp: () => void;
  onLeave: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const keys = useRef(new Set<string>());
  const actions = useRef({ onEnter, onKeys, onHelp, onLeave });
  actions.current = { onEnter, onKeys, onHelp, onLeave };
  const lockedRef = useRef(locked);
  lockedRef.current = locked;
  const [prompt, setPrompt] = useState("The office door is lit. Walk up and press E.");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const player = { x: 200, y: 186, moving: false };
    let frame = 0;
    let last = performance.now();
    let currentPrompt = "";

    const loop = (now: number) => {
      const dt = Math.min(0.04, (now - last) / 1000);
      last = now;
      let dx = 0;
      let dy = 0;
      if (!lockedRef.current) {
        if (keys.current.has("w") || keys.current.has("arrowup")) dy -= 1;
        if (keys.current.has("s") || keys.current.has("arrowdown")) dy += 1;
        if (keys.current.has("a") || keys.current.has("arrowleft")) dx -= 1;
        if (keys.current.has("d") || keys.current.has("arrowright")) dx += 1;
      }
      player.moving = dx !== 0 || dy !== 0;
      if (player.moving) {
        const len = Math.hypot(dx, dy) || 1;
        const speed = 78;
        const nx = player.x + (dx / len) * speed * dt;
        const ny = player.y + (dy / len) * speed * dt;
        if (!blocked(nx, player.y)) player.x = nx;
        if (!blocked(player.x, ny)) player.y = ny;
        player.x = Math.max(8, Math.min(392, player.x));
        player.y = Math.max(8, Math.min(252, player.y));
      }

      const nearDoor = player.x > 176 && player.x < 220 && player.y > 146 && player.y < 176;
      const nearKeys = Math.hypot(player.x - 126, player.y - 176) < 24;
      const nearHelp = Math.hypot(player.x - 296, player.y - 176) < 24;
      const nearRoad = player.y > 242;
      const nextPrompt = nearDoor
        ? "E — ENTER THE SECURITY OFFICE"
        : nearKeys
          ? "E — FLOOR KEYCARDS"
          : nearHelp
            ? "E — HOW A NIGHT SHIFT WORKS"
            : nearRoad
              ? "E — LEAVE THE BLOCK"
              : "WASD to walk. The cyan door is the office.";
      if (nextPrompt !== currentPrompt) {
        currentPrompt = nextPrompt;
        setPrompt(nextPrompt);
      }

      drawLot(ctx, now, player);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    const down = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(key)) {
        event.preventDefault();
      }
      keys.current.add(key);
      if (lockedRef.current || event.repeat) return;
      if (key === "e" || key === "enter" || key === " ") {
        const nearDoor = player.x > 176 && player.x < 220 && player.y > 146 && player.y < 176;
        const nearKeys = Math.hypot(player.x - 126, player.y - 176) < 24;
        const nearHelp = Math.hypot(player.x - 296, player.y - 176) < 24;
        const nearRoad = player.y > 242;
        if (nearDoor) actions.current.onEnter();
        else if (nearKeys) actions.current.onKeys();
        else if (nearHelp) actions.current.onHelp();
        else if (nearRoad) actions.current.onLeave();
      }
    };
    const up = (event: KeyboardEvent) => keys.current.delete(event.key.toLowerCase());
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      keys.current.clear();
    };
  }, []);

  const hold = (key: string) => ({
    onPointerDown: (event: React.PointerEvent) => {
      event.preventDefault();
      keys.current.add(key);
    },
    onPointerUp: () => keys.current.delete(key),
    onPointerLeave: () => keys.current.delete(key),
  });

  return (
    <div className="lot">
      <div className="stage">
        <canvas ref={canvasRef} width={400} height={260} />
        <div className="motel-sign">
          <strong>MATRIX MOTEL</strong>
          <em>VACANCY</em>
        </div>
        <p className="lot-prompt">{prompt}</p>
      </div>
      <div className="lot-actions">
        <button type="button" data-testid="enter-office" onClick={onEnter}>
          ENTER OFFICE
        </button>
        <button type="button" data-testid="open-floors" onClick={onKeys}>
          KEYCARDS
        </button>
        <button type="button" onClick={onHelp}>
          HOW TO PLAY
        </button>
        <button type="button" onClick={onLeave}>
          LEAVE BLOCK
        </button>
      </div>
      <div className="dpad" aria-hidden="true">
        <button type="button" {...hold("w")}>
          W
        </button>
        <div>
          <button type="button" {...hold("a")}>
            A
          </button>
          <button type="button" {...hold("s")}>
            S
          </button>
          <button type="button" {...hold("d")}>
            D
          </button>
        </div>
      </div>
    </div>
  );
}
