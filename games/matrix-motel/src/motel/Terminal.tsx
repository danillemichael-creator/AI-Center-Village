import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { sfx } from "../game/audio";
import {
  attackRoutes,
  blockedAttempts,
  forecast,
  judge,
  pathEdgesTo,
  propagate,
  serviceStatus,
} from "../game/engine";
import { BOARD_H, BOARD_W, edgeGeometry } from "../game/geometry";
import { LEVELS } from "../game/levels";
import type { LevelDef, Outcome, ServiceState } from "../game/types";
import { Board } from "./Board";
import { HelpCard } from "./HelpCard";
import { MatrixPortrait, TypeLine } from "./pixels";

type Phase = "intro" | "plan" | "wave" | "win" | "lose" | "pause" | "help";

interface Model {
  phase: Phase;
  resume: Phase;
  helpFrom: Phase;
  infected: Set<string>;
  disabled: Set<string>;
  selectedId: string | null;
  inspected: string | null;
  introPage: number;
  narrator: string;
  floater: { edgeId: string; text: string } | null;
  pulse: { edgeId: string; kind: "infect" | "block" } | null;
  shake: boolean;
  remainTenths: number;
  verdict: Extract<Outcome, { type: "loss" }> | null;
}

const HOP_MS = 280;

function createModel(level: LevelDef): Model {
  return {
    phase: "intro",
    resume: "plan",
    helpFrom: "pause",
    infected: new Set(level.infected),
    disabled: new Set(),
    selectedId: level.spotlight ?? level.edges[0]?.id ?? null,
    inspected: null,
    introPage: 0,
    narrator: level.intro[0] ?? level.objective,
    floater: null,
    pulse: null,
    shake: false,
    remainTenths: level.countdown * 10,
    verdict: null,
  };
}

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function reducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function formatClock(tenths: number) {
  const safe = Math.max(0, tenths);
  const seconds = Math.floor(safe / 10);
  const frac = safe % 10;
  return `${seconds}.${frac}`;
}

function nodeLabel(level: LevelDef, id: string) {
  return level.nodes.find((node) => node.id === id)?.label ?? id;
}

function pickEdge(level: LevelDef, selectedId: string | null, dx: number, dy: number) {
  const nodes = new Map(level.nodes.map((node) => [node.id, node]));
  const points = level.edges.flatMap((edge) => {
    const a = nodes.get(edge.a);
    const b = nodes.get(edge.b);
    if (!a || !b) return [];
    const geo = edgeGeometry(a, b, edge.bend ?? 0);
    return [{ id: edge.id, x: geo.x, y: geo.y }];
  });
  const current = points.find((point) => point.id === selectedId);
  const origin = current ?? {
    id: "",
    x: dx > 0 ? -1 : dx < 0 ? BOARD_W + 1 : BOARD_W / 2,
    y: dy > 0 ? -1 : dy < 0 ? BOARD_H + 1 : BOARD_H / 2,
  };
  let bestId = selectedId;
  let bestScore = Number.POSITIVE_INFINITY;
  for (const point of points) {
    if (point.id === origin.id) continue;
    const vx = point.x - origin.x;
    const vy = point.y - origin.y;
    const along = vx * dx + vy * dy;
    if (along < 16) continue;
    const dist = Math.hypot(vx, vy) || 1;
    if (along / dist < 0.42) continue;
    const lateral = Math.abs(vx * dy - vy * dx);
    const score = dist + lateral * 0.35;
    if (score < bestScore) {
      bestScore = score;
      bestId = point.id;
    }
  }
  return bestId;
}

function directionOf(key: string) {
  const name = key.toLowerCase();
  if (name === "arrowup" || name === "w") return { dx: 0, dy: -1 };
  if (name === "arrowdown" || name === "s") return { dx: 0, dy: 1 };
  if (name === "arrowleft" || name === "a") return { dx: -1, dy: 0 };
  if (name === "arrowright" || name === "d") return { dx: 1, dy: 0 };
  return null;
}

function groupsOf(level: LevelDef) {
  const groups: { name: string; edges: LevelDef["edges"] }[] = [];
  for (const edge of level.edges) {
    const found = groups.find((group) => group.name === edge.group);
    if (found) found.edges.push(edge);
    else groups.push({ name: edge.group, edges: [edge] });
  }
  return groups;
}

function legendFor(level: LevelDef) {
  const items: { label: string; className: string }[] = [
    { label: "INFECTED", className: "infected" },
    { label: "STABLE", className: "stable" },
  ];
  if (level.nodes.some((node) => node.protected)) items.push({ label: "AT RISK", className: "risk" });
  if (level.nodes.some((node) => !node.protected && !level.infected.includes(node.id))) {
    items.push({ label: "EXPOSED", className: "exposed" });
  }
  if (level.nodes.some((node) => node.protected)) items.push({ label: "SHIELD", className: "shield" });
  if (level.nodes.some((node) => node.essential)) items.push({ label: "SERVICE", className: "service" });
  if (level.edges.some((edge) => edge.vulnerable)) items.push({ label: "OPEN", className: "open" });
  items.push({ label: "CUT", className: "cut" });
  if (level.edges.some((edge) => !edge.vulnerable)) items.push({ label: "SAFE", className: "safe" });
  if (level.edges.some((edge) => edge.vulnerable)) items.push({ label: "NEXT", className: "next" });
  return items;
}

function runLabel(routes: number, lampsOk: boolean) {
  if (routes !== 0) return "RUN WAVE";
  return lampsOk ? "LOCK IN" : "LOCK IN — SERVICES DOWN";
}

export function Terminal({
  level,
  onCleared,
  onNext,
  onLeave,
  onJump,
  leaveLabel,
  isLast,
}: {
  level: LevelDef;
  onCleared: () => void;
  onNext: () => void;
  onLeave: () => void;
  onJump: (index: number) => void;
  leaveLabel: string;
  isLast: boolean;
}) {
  const modelRef = useRef<Model>(createModel(level));
  const levelIdRef = useRef(level.id);
  const waveToken = useRef(0);
  const fastRef = useRef(false);
  const life = useRef(0);
  const floaterTimer = useRef(0);
  const clearedOnce = useRef(false);
  const onClearedRef = useRef(onCleared);
  const onNextRef = useRef(onNext);
  const [tick, setTick] = useState(0);
  const [scale, setScale] = useState(1);
  const frameRef = useRef<HTMLDivElement>(null);
  onClearedRef.current = onCleared;
  onNextRef.current = onNext;

  if (levelIdRef.current !== level.id) {
    levelIdRef.current = level.id;
    waveToken.current += 1;
    life.current += 1;
    fastRef.current = false;
    modelRef.current = createModel(level);
  }

  const bump = () => setTick((value) => value + 1);

  const showFloater = (edgeId: string, text: string) => {
    const model = modelRef.current;
    const generation = life.current;
    model.floater = { edgeId, text };
    window.clearTimeout(floaterTimer.current);
    floaterTimer.current = window.setTimeout(() => {
      if (life.current !== generation) return;
      if (modelRef.current.floater?.edgeId === edgeId && modelRef.current.floater.text === text) {
        modelRef.current.floater = null;
        bump();
      }
    }, 1200);
  };

  const beginPlan = () => {
    const model = modelRef.current;
    model.phase = "plan";
    model.resume = "plan";
    model.remainTenths = level.countdown * 10;
    model.narrator = level.objective;
    model.pulse = null;
    model.shake = false;
    if (!model.selectedId) model.selectedId = level.spotlight ?? level.edges[0]?.id ?? null;
    bump();
  };

  const restart = () => {
    life.current += 1;
    waveToken.current += 1;
    fastRef.current = false;
    window.clearTimeout(floaterTimer.current);
    const fresh = createModel(level);
    fresh.phase = "plan";
    fresh.narrator = level.objective;
    modelRef.current = fresh;
    sfx.ui();
    bump();
  };

  const hold = async (token: number, ms: number) => {
    let waited = 0;
    while (waited < (fastRef.current || reducedMotion() ? 40 : ms)) {
      if (waveToken.current !== token) return false;
      const phase = modelRef.current.phase;
      if (phase === "pause" || phase === "help") {
        await delay(40);
        continue;
      }
      await delay(40);
      waited += 40;
    }
    return waveToken.current === token;
  };

  const runWave = async () => {
    const model = modelRef.current;
    if (model.phase !== "plan") return;
    fastRef.current = false;
    const token = waveToken.current;
    const full = attackRoutes(level, model.infected, model.disabled) === 0;
    model.phase = "wave";
    model.floater = null;
    model.inspected = null;
    model.narrator = full
      ? "No open route into a shielded system. The dirty segment is about to fall."
      : "Wave moving. GHOST takes one hop.";
    bump();

    const seenBlocks = new Set<string>();
    const turned: string[] = [];
    let shieldHit = false;
    const limit = level.nodes.length + 2;

    for (let hop = 0; hop < limit; hop += 1) {
      if (waveToken.current !== token) return;
      const blocks = blockedAttempts(level, model.infected, model.disabled);
      for (const block of blocks) {
        const key = `${block.edge}:${block.from}`;
        if (seenBlocks.has(key)) continue;
        seenBlocks.add(key);
        if (waveToken.current !== token) return;
        model.pulse = { edgeId: block.edge, kind: "block" };
        sfx.block();
        bump();
        if (!(await hold(token, HOP_MS))) return;
      }

      const step = propagate(level, model.infected, model.disabled);
      if (step.events.length === 0) break;
      for (const event of step.events) {
        if (waveToken.current !== token) return;
        model.infected.add(event.node);
        turned.push(event.node);
        model.pulse = { edgeId: event.edge, kind: "infect" };
        model.shake = true;
        model.narrator = `${nodeLabel(level, event.node)} just went red.`;
        sfx.infect();
        bump();
        if (!(await hold(token, HOP_MS))) return;
        model.shake = false;
        const node = level.nodes.find((item) => item.id === event.node);
        if (node?.protected) shieldHit = true;
      }
      if (shieldHit || !full) break;
    }

    if (waveToken.current !== token) return;
    model.pulse = null;
    model.shake = false;
    const verdict = judge(level, model.infected, model.disabled);
    if (waveToken.current !== token) return;

    if (verdict.type === "win") {
      model.phase = "win";
      model.narrator = level.success[0] ?? "Floor secure.";
      sfx.win();
      if (!clearedOnce.current) {
        clearedOnce.current = true;
        onClearedRef.current();
      }
    } else if (verdict.type === "loss") {
      model.phase = "lose";
      model.verdict = verdict;
      model.narrator = verdict.headline;
      sfx.lose();
    } else {
      model.phase = "plan";
      model.remainTenths = level.countdown * 10;
      const names = turned.map((id) => nodeLabel(level, id));
      model.narrator =
        names.length > 0
          ? `${names.join(" and ")} just went red.`
          : "GHOST hit a cut and stalled. It is still in the network.";
    }
    bump();
  };

  const applyFeedback = (
    edgeId: string,
    beforeServices: ServiceState[],
    afterServices: ServiceState[],
    beforeRoutes: number,
    afterRoutes: number,
  ) => {
    const model = modelRef.current;
    const offline = afterServices.filter(
      (item) => !item.ok && beforeServices.some((prev) => prev.id === item.id && prev.ok),
    );
    const restored = afterServices.filter(
      (item) => item.ok && beforeServices.some((prev) => prev.id === item.id && !prev.ok),
    );
    const firstDown = offline[0];
    const firstUp = restored[0];
    if (firstDown) {
      const extra = offline
        .slice(1)
        .map((item) => item.name)
        .join(" AND ");
      model.narrator = extra
        ? `${firstDown.name} OFFLINE — ${firstDown.serviceLabel} lost its path to ${firstDown.anchorLabel}. ${extra} OFFLINE too.`
        : `${firstDown.name} OFFLINE — ${firstDown.serviceLabel} lost its path to ${firstDown.anchorLabel}.`;
      showFloater(edgeId, "OFFLINE");
      return;
    }
    if (firstUp) {
      model.narrator = `${firstUp.name} restored. ${firstUp.serviceLabel} can reach ${firstUp.anchorLabel} again.`;
      showFloater(edgeId, "RESTORED");
      return;
    }
    if (Number.isFinite(beforeRoutes) && Number.isFinite(afterRoutes) && beforeRoutes !== afterRoutes) {
      if (afterRoutes < beforeRoutes) {
        showFloater(edgeId, `ROUTES -${beforeRoutes - afterRoutes}`);
        if (afterRoutes === 0) {
          model.narrator =
            "No vulnerable route reaches a shielded system. Check the lamps, then lock in.";
          sfx.ready();
        } else {
          model.narrator = `A route closed. ${afterRoutes} still reach a shielded system.`;
        }
      } else {
        showFloater(edgeId, "ROUTE OPENED");
        model.narrator = "A vulnerable route opened back up.";
      }
      return;
    }
    showFloater(edgeId, "NO CHANGE");
  };

  const toggle = (edgeId: string) => {
    const model = modelRef.current;
    if (model.phase !== "plan") return;
    model.selectedId = edgeId;
    const wasCut = model.disabled.has(edgeId);
    if (!wasCut && level.maxCuts !== null && model.disabled.size >= level.maxCuts) {
      sfx.deny();
      model.narrator = "No switches left. Restore one if you want a different cut.";
      bump();
      return;
    }
    const beforeServices = serviceStatus(level, model.disabled);
    const beforeRoutes = attackRoutes(level, model.infected, model.disabled);
    if (wasCut) {
      model.disabled.delete(edgeId);
      sfx.on();
    } else {
      model.disabled.add(edgeId);
      sfx.off();
    }
    applyFeedback(
      edgeId,
      beforeServices,
      serviceStatus(level, model.disabled),
      beforeRoutes,
      attackRoutes(level, model.infected, model.disabled),
    );
    bump();
  };

  const selectEdge = (edgeId: string) => {
    const model = modelRef.current;
    if (model.phase !== "plan") return;
    if (model.selectedId === edgeId) return;
    model.selectedId = edgeId;
    bump();
  };

  const inspect = (nodeId: string) => {
    const model = modelRef.current;
    if (model.phase !== "plan") return;
    if (model.inspected === nodeId) {
      model.inspected = null;
      model.narrator = "Trace cleared.";
    } else {
      model.inspected = nodeId;
      model.narrator = `Trace on ${nodeLabel(level, nodeId)}. Lit cables can still carry GHOST to this system.`;
    }
    bump();
  };

  const hint = () => {
    const model = modelRef.current;
    if (model.phase !== "plan" && model.phase !== "pause") return;
    model.narrator = level.hint;
    sfx.ui();
    bump();
  };

  const pause = () => {
    const model = modelRef.current;
    if (model.phase !== "plan" && model.phase !== "wave") return;
    model.resume = model.phase;
    model.phase = "pause";
    sfx.ui();
    bump();
  };

  const resume = () => {
    const model = modelRef.current;
    if (model.phase !== "pause") return;
    model.phase = model.resume === "pause" || model.resume === "help" ? "plan" : model.resume;
    sfx.ui();
    bump();
  };

  const openHelp = () => {
    const model = modelRef.current;
    model.helpFrom = model.phase === "help" ? model.helpFrom : model.phase;
    model.phase = "help";
    sfx.ui();
    bump();
  };

  const closeHelp = () => {
    const model = modelRef.current;
    model.phase = model.helpFrom === "help" ? "pause" : model.helpFrom;
    bump();
  };

  const advanceIntro = () => {
    const model = modelRef.current;
    if (model.phase !== "intro") return;
    const last = model.introPage >= level.intro.length - 1;
    if (!last) {
      model.introPage += 1;
      model.narrator = level.intro[model.introPage] ?? model.narrator;
      sfx.ui();
      bump();
      return;
    }
    sfx.ui();
    beginPlan();
  };

  const api = useRef({ tickClock: () => {}, runWave, restart, toggle });
  api.current.tickClock = () => {
    const model = modelRef.current;
    if (model.phase !== "plan") return;
    if (model.remainTenths <= 0) {
      void api.current.runWave();
      return;
    }
    const before = Math.ceil(model.remainTenths / 10);
    model.remainTenths -= 1;
    const after = Math.ceil(model.remainTenths / 10);
    if (before !== after && after > 0 && after <= 5) sfx.tick();
    if (model.remainTenths <= 0) {
      bump();
      void api.current.runWave();
      return;
    }
    bump();
  };
  api.current.runWave = runWave;
  api.current.restart = restart;
  api.current.toggle = toggle;

  useEffect(() => {
    const id = window.setInterval(() => api.current.tickClock(), 100);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const key = event.key;
      if (key === " " || key.startsWith("Arrow")) event.preventDefault();
      const model = modelRef.current;

      if (key === "Escape") {
        event.preventDefault();
        if (model.phase === "intro") beginPlan();
        else if (model.phase === "help") closeHelp();
        else if (model.phase === "pause") resume();
        else if (model.phase === "plan" || model.phase === "wave") pause();
        return;
      }

      if ((key === "r" || key === "R") && !event.repeat) {
        api.current.restart();
        return;
      }

      if (model.phase === "wave") {
        if (key === "Enter" || key === " ") fastRef.current = true;
        return;
      }

      if (model.phase === "intro") {
        if ((key === "Enter" || key === " ") && !event.repeat) {
          event.preventDefault();
          advanceIntro();
        }
        return;
      }

      if (model.phase === "win" && key === "Enter" && !event.repeat) {
        event.preventDefault();
        onNextRef.current();
        return;
      }

      if (model.phase === "lose" && (key === "Enter" || key === " ") && !event.repeat) {
        event.preventDefault();
        api.current.restart();
        return;
      }

      if (model.phase !== "plan") return;

      if ((key === "h" || key === "H") && !event.repeat) {
        hint();
        return;
      }
      if ((key === "e" || key === "E" || key === " ") && !event.repeat) {
        event.preventDefault();
        if (model.selectedId) api.current.toggle(model.selectedId);
        return;
      }
      if (key === "Enter" && !event.repeat) {
        event.preventDefault();
        void api.current.runWave();
        return;
      }
      const direction = directionOf(key);
      if (!direction) return;
      const next = pickEdge(level, model.selectedId, direction.dx, direction.dy);
      if (next && next !== model.selectedId) {
        model.selectedId = next;
        bump();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const apply = () => {
      const width = frame.clientWidth;
      setScale(width > 0 ? width / BOARD_W : 1);
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    return () => {
      waveToken.current += 1;
      life.current += 1;
      window.clearTimeout(floaterTimer.current);
    };
  }, []);

  const model = modelRef.current;
  const routes = attackRoutes(level, model.infected, model.disabled);
  const services = serviceStatus(level, model.disabled);
  const lampsOk = services.every((item) => item.ok);
  const fore = forecast(level, model.infected, model.disabled);
  const atRisk = new Set(
    level.nodes
      .filter((node) => node.protected && fore.has(node.id) && !model.infected.has(node.id))
      .map((node) => node.id),
  );
  const exposed = new Set(
    level.nodes
      .filter((node) => !node.protected && fore.has(node.id) && !model.infected.has(node.id))
      .map((node) => node.id),
  );
  const nextEdges =
    model.phase === "plan"
      ? new Set(propagate(level, model.infected, model.disabled).events.map((event) => event.edge))
      : new Set<string>();
  const traceEdges = model.inspected
    ? pathEdgesTo(level, model.infected, model.disabled, model.inspected)
    : new Set<string>();
  const routeShown = Number.isFinite(routes) ? String(routes) : "!";
  const cuts =
    level.maxCuts === null ? `${model.disabled.size}` : `${model.disabled.size}/${level.maxCuts}`;
  const urgent = model.phase === "plan" && model.remainTenths <= 50;
  const talking = model.phase === "intro" || model.phase === "wave" || model.floater !== null;
  const introText = level.intro[model.introPage] ?? "";
  const introLast = model.introPage >= level.intro.length - 1;
  const groups = groupsOf(level);
  const legend = legendFor(level);

  return (
    <section
      className="terminal"
      data-testid="terminal"
      data-phase={model.phase}
      data-tick={tick}
      onPointerDownCapture={() => {
        if (modelRef.current.phase === "wave") fastRef.current = true;
      }}
    >
      <header className="hud">
        <div className="hud-top">
          <div>
            <p className="kicker">
              FLOOR {level.id} / {LEVELS.length}
            </p>
            <h1>{level.title}</h1>
            <p className="objective">{level.objective}</p>
          </div>
          <div className={`routes ${routes === 0 ? "clear" : ""}`} data-testid="attack-routes">
            <span>ATTACK ROUTES</span>
            <strong>{routeShown}</strong>
          </div>
        </div>
        <div className="hud-meters">
          <div className={`clock ${urgent ? "urgent" : ""}`} data-testid="countdown">
            <span>CLOCK</span>
            <strong>{formatClock(model.remainTenths)}</strong>
          </div>
          <div className="budget" data-testid="budget">
            <span>SWITCHES</span>
            <strong>{cuts}</strong>
          </div>
          <div className="lamps">
            {services.length === 0 && <p className="no-lamps">No service lamps on this floor.</p>}
            {services.map((item) => (
              <span
                key={item.id}
                className={item.ok ? "lamp on" : "lamp off"}
                data-testid={`service-${item.id}`}
              >
                <i />
                <span>
                  <small>{item.name}</small>
                  <b>{item.ok ? "ONLINE" : "OFFLINE"}</b>
                </span>
              </span>
            ))}
          </div>
          <button
            type="button"
            className={[
              "pixel-btn",
              "run-btn",
              routes === 0 && lampsOk ? "primary" : "",
              routes === 0 && !lampsOk ? "danger" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            data-testid="run-wave"
            onClick={() => void runWave()}
          >
            {model.phase === "wave" ? "GHOST IS MOVING" : runLabel(routes, lampsOk)}
          </button>
        </div>
        <div className={urgent ? "clock-bar urgent" : "clock-bar"} aria-hidden="true">
          <i style={{ width: `${Math.max(0, Math.min(100, (model.remainTenths / (level.countdown * 10)) * 100))}%` }} />
        </div>
      </header>

      <div className="console">
        <div className="board-column">
          <div className="board-frame" ref={frameRef}>
            <div className="board-scaler" style={{ transform: `scale(${scale})` }}>
              <Board
                level={level}
                infected={model.infected}
                disabled={model.disabled}
                atRisk={atRisk}
                exposed={exposed}
                nextEdges={nextEdges}
                traceEdges={traceEdges}
                selectedId={model.selectedId}
                pulse={model.pulse}
                floater={model.floater}
                shake={model.shake}
                onToggle={toggle}
                onSelect={selectEdge}
                onInspect={inspect}
              />
            </div>
          </div>
          {model.phase === "wave" && <p className="wave-banner">WAVE LIVE — CLICK TO RUSH</p>}
          <ul className="legend">
            {legend.map((item) => (
              <li key={item.label}>
                <i className={`swatch ${item.className}`} />
                {item.label}
              </li>
            ))}
          </ul>
          <p className="controls-foot">
            WASD or arrows select a link. E or Space cuts it. Enter runs the wave. H hints. R restarts. Esc pauses.
          </p>
        </div>

        <aside className="side">
          <div className="narrator-card">
            <MatrixPortrait talking={talking} />
            <div>
              <p className="who">M.A.T.R.I.X.</p>
              <p className="narrator-line" data-testid="narrator">
                {model.narrator}
              </p>
            </div>
          </div>
          <div className="narrator-actions">
            <button type="button" className="pixel-btn" data-testid="hint" onClick={hint}>
              HINT
            </button>
            <button type="button" className="pixel-btn" data-testid="pause" onClick={pause}>
              PAUSE
            </button>
          </div>
          <div className="link-list">
            <p className="kicker">CONNECTIONS</p>
            {groups.map((group) => (
              <div key={group.name} className="link-group">
                <h3>{group.name}</h3>
                {group.edges.map((edge) => {
                  const cut = model.disabled.has(edge.id);
                  const state = cut ? "CUT" : edge.vulnerable ? "OPEN" : "SAFE";
                  return (
                    <button
                      key={edge.id}
                      type="button"
                      className={[
                        "link-btn",
                        cut ? "is-cut" : "",
                        edge.vulnerable ? "is-vuln" : "is-safe",
                        model.selectedId === edge.id ? "is-selected" : "",
                        nextEdges.has(edge.id) ? "is-next" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      data-testid={`link-${edge.id}`}
                      aria-pressed={cut}
                      onClick={() => toggle(edge.id)}
                    >
                      <span>{edge.label}</span>
                      <b>{state}</b>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </aside>
      </div>

      {model.phase === "intro" && (
        <div className="overlay">
          <div className="sheet brief">
            <MatrixPortrait talking />
            <p className="who">M.A.T.R.I.X.</p>
            <p className="brief-text">
              <TypeLine key={`${level.id}-${model.introPage}`} text={introText} />
            </p>
            <button type="button" className="pixel-btn primary" data-testid="dialogue-next" onClick={advanceIntro}>
              {introLast ? "BEGIN SHIFT" : "CONTINUE"}
            </button>
            <p className="skip">
              PAGE {model.introPage + 1}/{level.intro.length} · ESC SKIPS THE BRIEF
            </p>
          </div>
        </div>
      )}

      {model.phase === "pause" && (
        <div className="overlay" data-testid="pause-menu">
          <div className="sheet">
            <p className="kicker">HOLDING THE WAVE</p>
            <h2>SHIFT PAUSED</h2>
            <div className="sheet-actions">
              <button type="button" className="pixel-btn primary" onClick={resume}>
                RESUME
              </button>
              <button type="button" className="pixel-btn" onClick={restart}>
                RESTART FLOOR
              </button>
              <button type="button" className="pixel-btn" onClick={openHelp}>
                HOW TO PLAY
              </button>
              <button type="button" className="pixel-btn" onClick={onLeave}>
                {leaveLabel}
              </button>
            </div>
            <div className="floor-jumps">
              {LEVELS.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  className="pixel-btn"
                  data-testid={`jump-${item.id}`}
                  onClick={() => onJump(index)}
                >
                  FLOOR {item.id}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {model.phase === "help" && (
        <div className="overlay">
          <div className="sheet">
            <HelpCard />
            <button type="button" className="pixel-btn primary" onClick={closeHelp}>
              BACK
            </button>
          </div>
        </div>
      )}

      {model.phase === "win" && (
        <div className="overlay" data-testid="win-overlay">
          <div className="sheet win-sheet">
            <p className="kicker">FLOOR {level.id} CLEAR</p>
            <h2>{level.codename}</h2>
            <p className="principle">PRINCIPLE · {level.principle}</p>
            {level.success.map((line) => (
              <p key={line} className="success-line">
                <TypeLine text={line} />
              </p>
            ))}
            <button type="button" className="pixel-btn primary" data-testid="next-floor" onClick={onNext}>
              {isLast ? "SECURE THE MOTEL" : "NEXT FLOOR"}
            </button>
          </div>
        </div>
      )}

      {model.phase === "lose" && model.verdict && (
        <div className="overlay" data-testid="lose-overlay">
          <div className="sheet lose-sheet">
            <p className="kicker">{model.verdict.kind === "outage" ? "OUTAGE" : "BREACH"}</p>
            <h2>{model.verdict.headline}</h2>
            <p className="verdict-detail">{model.verdict.detail}</p>
            <p className="verdict-note">{level.notes[model.verdict.kind]}</p>
            <button type="button" className="pixel-btn danger" data-testid="try-again" onClick={restart}>
              TRY AGAIN
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
