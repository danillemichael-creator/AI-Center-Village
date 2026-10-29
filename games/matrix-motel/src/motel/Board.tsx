import type { LevelDef } from "../game/types";
import { BOARD_H, BOARD_W, edgeGeometry } from "../game/geometry";
import { KindIcon } from "./pixels";

function relaxSwitches(
  spots: { id: string; x: number; y: number }[],
  nodes: { x: number; y: number }[],
) {
  const clearNodes = (min: number) => {
    for (const spot of spots) {
      for (let pass = 0; pass < 8; pass += 1) {
        let fx = 0;
        let fy = 0;
        let hits = 0;
        for (const node of nodes) {
          const dx = spot.x - node.x;
          const dy = spot.y - node.y;
          const dist = Math.hypot(dx, dy) || 0.01;
          if (dist < min) {
            fx += (dx / dist) * (min - dist);
            fy += (dy / dist) * (min - dist);
            hits += 1;
          }
        }
        if (!hits) break;
        if (Math.hypot(fx, fy) < 1) spot.y -= 20;
        else {
          spot.x += fx;
          spot.y += fy;
        }
      }
    }
  };
  const separate = (min: number) => {
    for (let pass = 0; pass < 10; pass += 1) {
      for (let i = 0; i < spots.length; i += 1) {
        for (let j = i + 1; j < spots.length; j += 1) {
          const a = spots[i];
          const b = spots[j];
          if (!a || !b) continue;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.hypot(dx, dy) || 0.01;
          if (dist < min) {
            const push = (min - dist) / 2;
            const ox = dx === 0 && dy === 0 ? 0 : dx / dist;
            const oy = dx === 0 && dy === 0 ? -1 : dy / dist;
            a.x -= ox * push;
            a.y -= oy * push;
            b.x += ox * push;
            b.y += oy * push;
          }
        }
      }
    }
  };
  clearNodes(112);
  separate(74);
  clearNodes(104);
  separate(70);
  for (const spot of spots) {
    spot.x = Math.max(36, Math.min(BOARD_W - 36, spot.x));
    spot.y = Math.max(22, Math.min(BOARD_H - 22, spot.y));
  }
}

export function Board({
  level,
  infected,
  disabled,
  atRisk,
  exposed,
  nextEdges,
  traceEdges,
  selectedId,
  pulse,
  floater,
  shake,
  onToggle,
  onSelect,
  onInspect,
}: {
  level: LevelDef;
  infected: ReadonlySet<string>;
  disabled: ReadonlySet<string>;
  atRisk: ReadonlySet<string>;
  exposed: ReadonlySet<string>;
  nextEdges: ReadonlySet<string>;
  traceEdges: ReadonlySet<string>;
  selectedId: string | null;
  pulse: { edgeId: string; kind: "infect" | "block" } | null;
  floater: { edgeId: string; text: string } | null;
  shake: boolean;
  onToggle: (edgeId: string) => void;
  onSelect: (edgeId: string) => void;
  onInspect: (nodeId: string) => void;
}) {
  const nodes = new Map(level.nodes.map((node) => [node.id, node]));
  const spots = level.edges.flatMap((edge) => {
    const a = nodes.get(edge.a);
    const b = nodes.get(edge.b);
    if (!a || !b) return [];
    const geo = edgeGeometry(a, b, edge.bend ?? 0);
    return [{ id: edge.id, x: geo.x, y: geo.y }];
  });
  relaxSwitches(spots, level.nodes);
  const spotOf = new Map(spots.map((spot) => [spot.id, spot]));

  return (
    <div className={shake ? "board shake" : "board"} data-testid="network-board">
      <svg viewBox={`0 0 ${BOARD_W} ${BOARD_H}`} className="cables" aria-hidden="true">
        {level.zones.map((zone) => (
          <g key={zone.label}>
            <rect
              x={zone.x}
              y={zone.y}
              width={zone.w}
              height={zone.h}
              className={`zone ${zone.tone}`}
            />
            <text x={zone.x + 10} y={zone.y + 18} className="zone-label">
              {zone.label}
            </text>
          </g>
        ))}
        {level.edges.map((edge) => {
          const a = nodes.get(edge.a);
          const b = nodes.get(edge.b);
          if (!a || !b) return null;
          const geo = edgeGeometry(a, b, edge.bend ?? 0);
          const cut = disabled.has(edge.id);
          const hot = pulse?.edgeId === edge.id && pulse.kind === "infect";
          const fizzle = pulse?.edgeId === edge.id && pulse.kind === "block";
          const next = nextEdges.has(edge.id);
          const traced = traceEdges.has(edge.id);
          const spotlight = level.spotlight === edge.id && !cut;
          const cls = [
            "cable",
            edge.vulnerable ? "vuln" : "patched",
            cut ? "cut" : "",
            next ? "next" : "",
            traced ? "trace" : "",
            hot ? "hot" : "",
            fizzle ? "fizzle" : "",
            spotlight ? "spotlight" : "",
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <path
              key={edge.id}
              d={geo.d}
              className={cls}
              onClick={() => onToggle(edge.id)}
            />
          );
        })}
      </svg>

      {level.edges.map((edge) => {
        const a = nodes.get(edge.a);
        const b = nodes.get(edge.b);
        if (!a || !b) return null;
        const geo = edgeGeometry(a, b, edge.bend ?? 0);
        const spot = spotOf.get(edge.id) ?? { x: geo.x, y: geo.y };
        const cut = disabled.has(edge.id);
        const next = nextEdges.has(edge.id);
        const selected = selectedId === edge.id;
        const label = cut ? "CUT" : edge.vulnerable ? "OPEN" : "SAFE";
        return (
          <button
            key={edge.id}
            type="button"
            className={[
              "switch",
              cut ? "is-cut" : "",
              edge.vulnerable ? "is-vuln" : "is-safe",
              next ? "is-next" : "",
              selected ? "is-selected" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            style={{ left: `${(spot.x / BOARD_W) * 100}%`, top: `${(spot.y / BOARD_H) * 100}%` }}
            onClick={() => onToggle(edge.id)}
            onMouseEnter={() => onSelect(edge.id)}
            data-testid={`switch-${edge.id}`}
            aria-pressed={cut}
            aria-label={`${edge.label}, ${label}`}
          >
            {label}
            {floater?.edgeId === edge.id && <em className="floater">{floater.text}</em>}
          </button>
        );
      })}

      {level.nodes.map((node) => {
        const lost = infected.has(node.id);
        const risk = atRisk.has(node.id);
        const open = exposed.has(node.id);
        const cls = [
          "node",
          lost ? "infected" : "",
          risk ? "risk" : "",
          open ? "exposed" : "",
          node.essential ? "service" : "",
          node.protected ? "shield" : "",
          node.anchor ? "anchor" : "",
        ]
          .filter(Boolean)
          .join(" ");
        const status = lost ? "INFECTED" : risk ? "AT RISK" : open ? "EXPOSED" : "STABLE";
        return (
          <button
            key={node.id}
            type="button"
            className={cls}
            style={{ left: `${(node.x / BOARD_W) * 100}%`, top: `${(node.y / BOARD_H) * 100}%` }}
            onClick={() => onInspect(node.id)}
            data-testid={`node-${node.id}`}
          >
            <span className="node-code">{node.code}</span>
            <KindIcon kind={node.kind} />
            <span className="node-label">{node.label}</span>
            <span className={`node-status s-${status.replace(" ", "-").toLowerCase()}`}>{status}</span>
            <span className="node-tags">
              {node.protected && <i>SHIELD</i>}
              {node.essential && <i>SERVICE</i>}
              {node.anchor && <i>CORE</i>}
            </span>
          </button>
        );
      })}
    </div>
  );
}
