import type { LevelDef } from "../game/types";
import { BOARD_H, BOARD_W, edgeGeometry } from "../game/geometry";
import { KindIcon } from "./pixels";

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
            style={{ left: `${(geo.x / BOARD_W) * 100}%`, top: `${(geo.y / BOARD_H) * 100}%` }}
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
