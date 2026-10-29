import { LEVELS, LESSONS } from "./levels.js";
import { BOARD_H, BOARD_W, edgeGeometry } from "./geometry.js";
import {
  attackRoutes,
  blockedAttempts,
  forecast,
  judge,
  pathEdgesTo,
  propagate,
  serviceStatus,
} from "./engine.js";
import { isMuted, setMuted, sfx } from "./audio.js";

const GAME_ID = "matrix-motel";
const FLOOR_TOKENS = 10;
const CLEAR_BONUS = 50;
const SAVE_KEY = "matrix-motel-cleared";
const PAY_KEY = "matrix-motel-paid";

const state = {
  floor: 0,
  infected: new Set(),
  disabled: new Set(),
  selected: null,
  traceTarget: null,
  phase: "intro",
  countdown: 0,
  log: "",
  pulse: null,
  outcome: null,
  paid: false,
  bonus: false,
  cleared: loadSet(SAVE_KEY),
};

let waveTimer = 0;
let clock = 0;

function loadSet(key) {
  try {
    const raw = JSON.parse(localStorage.getItem(key) || "[]");
    return new Set(Array.isArray(raw) ? raw.map(String) : []);
  } catch {
    return new Set();
  }
}

function saveSet(key, set) {
  try {
    localStorage.setItem(key, JSON.stringify([...set]));
  } catch {
    /* private mode */
  }
}

function esc(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[ch]);
}

function level() {
  return LEVELS[state.floor];
}

function nodeBy(id) {
  return level().nodes.find((node) => node.id === id);
}

function edgeBy(id) {
  return level().edges.find((edge) => edge.id === id);
}

function picture() {
  const current = level();
  const step = propagate(current, state.infected, state.disabled);
  const nextNodes = new Set(step.events.map((event) => event.node));
  const nextEdges = new Set(step.events.map((event) => event.edge));
  const doomed = forecast(current, state.infected, state.disabled);
  const atRisk = new Set(
    [...doomed].filter((id) => !state.infected.has(id) && !nextNodes.has(id)),
  );
  const services = serviceStatus(current, state.disabled);
  const routes = attackRoutes(current, state.infected, state.disabled);
  const trace = state.traceTarget
    ? pathEdgesTo(current, state.infected, state.disabled, state.traceTarget)
    : new Set();
  return { current, step, nextNodes, nextEdges, atRisk, services, routes, trace };
}

function paintTokens() {
  const el = document.getElementById("token-readout");
  if (!el || !window.AIVice) return;
  el.textContent = `TOKENS ${AIVice.getTokens()}`;
}

function payFloor(levelId) {
  const ai = window.AIVice;
  if (ai && typeof ai.awardLevel === "function") {
    return !!ai.awardLevel(GAME_ID, levelId, FLOOR_TOKENS);
  }
  const paid = loadSet(PAY_KEY);
  const key = String(levelId);
  if (paid.has(key)) return false;
  paid.add(key);
  saveSet(PAY_KEY, paid);
  if (ai) ai.addTokens(GAME_ID, FLOOR_TOKENS);
  return true;
}

function payClear() {
  const ai = window.AIVice;
  if (!ai || !ai.markComplete(GAME_ID)) return false;
  ai.addTokens(GAME_ID, CLEAR_BONUS);
  return true;
}

function allClear() {
  return LEVELS.every((floor) => state.cleared.has(String(floor.id)));
}

function startFloor(index) {
  window.clearTimeout(waveTimer);
  const next = LEVELS[index];
  if (!next) return;
  state.floor = index;
  state.infected = new Set(next.infected);
  state.disabled = new Set();
  state.selected = next.spotlight || next.edges[0]?.id || null;
  state.traceTarget = null;
  state.phase = "intro";
  state.countdown = next.countdown;
  state.outcome = null;
  state.paid = false;
  state.bonus = false;
  state.pulse = null;
  state.log = "Orange cables are the next hop. Cyan cables are patched.";
  render();
}

function begin() {
  if (state.phase !== "intro") return;
  state.phase = "play";
  state.countdown = level().countdown;
  sfx.ready();
  render();
}

function toggle(edgeId) {
  if (state.phase !== "play" && state.phase !== "intro") return;
  const current = level();
  const edge = edgeBy(edgeId);
  if (!edge) return;
  state.selected = edgeId;
  if (state.disabled.has(edgeId)) {
    state.disabled.delete(edgeId);
    sfx.on();
    state.log = `${edge.label} restored.`;
  } else if (current.maxCuts !== null && state.disabled.size >= current.maxCuts) {
    sfx.deny();
    state.log = `Only ${current.maxCuts} cuts on this floor. Open a switch you already closed.`;
  } else {
    state.disabled.add(edgeId);
    sfx.off();
    state.log = edge.vulnerable
      ? `${edge.label} cut. GHOST cannot cross it.`
      : `${edge.label} cut. That patched line no longer carries service.`;
  }
  render();
}

function inspect(nodeId) {
  const node = nodeBy(nodeId);
  if (!node) return;
  if (node.protected) {
    state.traceTarget = state.traceTarget === nodeId ? null : nodeId;
    state.log = state.traceTarget
      ? `Tracing vulnerable routes that can still reach ${node.label}.`
      : `${node.label} trace cleared.`;
  } else {
    state.traceTarget = null;
    state.log = `${node.label} is ${state.infected.has(nodeId) ? "already lost" : "not a shielded system"}.`;
  }
  sfx.ui();
  render();
}

function directionOf(key) {
  if (key === "arrowup" || key === "w") return { dx: 0, dy: -1 };
  if (key === "arrowdown" || key === "s") return { dx: 0, dy: 1 };
  if (key === "arrowleft" || key === "a") return { dx: -1, dy: 0 };
  if (key === "arrowright" || key === "d") return { dx: 1, dy: 0 };
  return null;
}

function pickEdge(dx, dy) {
  const current = level();
  const nodes = new Map(current.nodes.map((node) => [node.id, node]));
  const points = current.edges.flatMap((edge) => {
    const a = nodes.get(edge.a);
    const b = nodes.get(edge.b);
    if (!a || !b) return [];
    const geo = edgeGeometry(a, b, edge.bend || 0);
    return [{ id: edge.id, x: geo.x, y: geo.y }];
  });
  const currentPoint = points.find((point) => point.id === state.selected);
  const origin = currentPoint || {
    id: "",
    x: dx > 0 ? -1 : dx < 0 ? BOARD_W + 1 : BOARD_W / 2,
    y: dy > 0 ? -1 : dy < 0 ? BOARD_H + 1 : BOARD_H / 2,
  };
  let bestId = state.selected;
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
  if (bestId && bestId !== state.selected) {
    state.selected = bestId;
    render();
  }
}

function release() {
  if (state.phase !== "play") return;
  const current = level();
  const blocks = blockedAttempts(current, state.infected, state.disabled);
  const step = propagate(current, state.infected, state.disabled);
  state.phase = "resolving";
  state.pulse = {
    infect: new Set(step.events.map((event) => event.edge)),
    block: new Set(blocks.map((block) => block.edge)),
  };
  if (step.events.length) sfx.infect();
  else if (blocks.length) sfx.block();
  render();
  const applied = step;
  const blocked = blocks;
  waveTimer = window.setTimeout(() => {
    if (state.phase !== "resolving") return;
    state.infected = applied.next;
    state.pulse = null;
    const verdict = judge(current, state.infected, state.disabled);
    if (verdict.type === "ongoing") {
      state.phase = "play";
      state.countdown = current.countdown;
      const moved = applied.events
        .map((event) => `${nodeBy(event.node)?.label || event.node} via ${edgeBy(event.edge)?.label || event.edge}`)
        .join(", ");
      state.log = moved
        ? `GHOST moved: ${moved}.`
        : blocked.length
          ? "GHOST hit a cut cable and stopped there."
          : "The wave found nowhere new to go.";
      render();
      return;
    }
    state.outcome = verdict;
    state.phase = verdict.type;
    if (verdict.type === "win") {
      state.cleared.add(String(current.id));
      saveSet(SAVE_KEY, state.cleared);
      state.paid = payFloor(current.id);
      state.bonus = allClear() ? payClear() : false;
      state.log = current.success[0] || "Floor secure.";
      sfx.win();
    } else {
      state.log = verdict.headline;
      sfx.lose();
    }
    paintTokens();
    render();
  }, 420);
}

function showHint() {
  state.log = level().hint;
  sfx.ui();
  render();
}

function toggleMute() {
  const next = !isMuted();
  setMuted(next);
  const ai = window.AIVice;
  if (ai && typeof ai.setMuted === "function") ai.setMuted(next);
  render();
}

function render() {
  const root = document.getElementById("app");
  if (!root) return;
  const view = picture();
  const current = view.current;
  const nodes = new Map(current.nodes.map((node) => [node.id, node]));
  const routeText = view.routes === Number.POSITIVE_INFINITY ? "INSIDE" : String(view.routes);
  const cutText = current.maxCuts === null ? `${state.disabled.size} · NO LIMIT` : `${state.disabled.size} / ${current.maxCuts}`;

  const zones = current.zones.map((zone) => `
    <g>
      <rect class="zone ${zone.tone}" x="${zone.x}" y="${zone.y}" width="${zone.w}" height="${zone.h}"></rect>
      <text class="zone-label" x="${zone.x + 10}" y="${zone.y + 18}">${esc(zone.label)}</text>
    </g>`).join("");

  const cables = current.edges.map((edge) => {
    const a = nodes.get(edge.a);
    const b = nodes.get(edge.b);
    if (!a || !b) return "";
    const geo = edgeGeometry(a, b, edge.bend || 0);
    const classes = [
      "cable",
      edge.vulnerable ? "vuln" : "patched",
      state.disabled.has(edge.id) ? "cut" : "",
      view.nextEdges.has(edge.id) ? "next" : "",
      view.trace.has(edge.id) ? "trace" : "",
      current.spotlight === edge.id && !state.disabled.has(edge.id) ? "spotlight" : "",
      state.pulse?.infect.has(edge.id) ? "hot" : "",
      state.pulse?.block.has(edge.id) ? "fizzle" : "",
    ].filter(Boolean).join(" ");
    return `<path class="${classes}" d="${geo.d}" data-action="toggle" data-edge="${esc(edge.id)}"></path>`;
  }).join("");

  const switches = current.edges.map((edge) => {
    const a = nodes.get(edge.a);
    const b = nodes.get(edge.b);
    if (!a || !b) return "";
    const geo = edgeGeometry(a, b, edge.bend || 0);
    const cut = state.disabled.has(edge.id);
    const label = cut ? "CUT" : edge.vulnerable ? "OPEN" : "SAFE";
    const classes = [
      "switch",
      cut ? "is-cut" : "",
      edge.vulnerable ? "is-vuln" : "is-safe",
      view.nextEdges.has(edge.id) ? "is-next" : "",
      state.selected === edge.id ? "is-selected" : "",
    ].filter(Boolean).join(" ");
    return `<button type="button" class="${classes}" style="left:${(geo.x / BOARD_W) * 100}%;top:${(geo.y / BOARD_H) * 100}%" data-action="toggle" data-edge="${esc(edge.id)}" data-testid="switch-${esc(edge.id)}" aria-pressed="${cut}" aria-label="${esc(edge.label)}, ${label}">${label}</button>`;
  }).join("");

  const nodeButtons = current.nodes.map((node) => {
    const lost = state.infected.has(node.id);
    const exposed = view.nextNodes.has(node.id);
    const risk = view.atRisk.has(node.id);
    const status = lost ? "INFECTED" : exposed ? "EXPOSED" : risk ? "AT RISK" : "STABLE";
    const classes = [
      "node",
      lost ? "infected" : "",
      exposed ? "exposed" : "",
      risk ? "risk" : "",
      node.protected ? "shield" : "",
      node.anchor ? "anchor" : "",
    ].filter(Boolean).join(" ");
    return `<button type="button" class="${classes}" style="left:${(node.x / BOARD_W) * 100}%;top:${(node.y / BOARD_H) * 100}%" data-action="inspect" data-node="${esc(node.id)}" data-testid="node-${esc(node.id)}"><span class="node-code">${esc(node.code)}</span><span class="node-label">${esc(node.label)}</span><span class="node-status">${status}</span></button>`;
  }).join("");

  let lastGroup = "";
  const links = current.edges.map((edge) => {
    const head = edge.group !== lastGroup ? `<p class="pixel group-label">${esc(edge.group)}</p>` : "";
    lastGroup = edge.group;
    const cut = state.disabled.has(edge.id);
    const flag = cut ? "CUT" : edge.vulnerable ? "OPEN" : "SAFE";
    const classes = [
      "linkrow",
      cut ? "cut" : "",
      edge.vulnerable ? "" : "safe",
      state.selected === edge.id ? "on" : "",
    ].filter(Boolean).join(" ");
    return `${head}<button type="button" class="${classes}" data-action="toggle" data-edge="${esc(edge.id)}" data-list="1"><span>${esc(edge.label)}</span><small>${flag}</small></button>`;
  }).join("");

  const services = view.services.length
    ? `<ul class="services">${view.services.map((item) => `<li class="${item.ok ? "ok" : "down"}">${esc(item.name)} ${item.ok ? "ONLINE" : "OFFLINE"}</li>`).join("")}</ul>`
    : `<p class="services">No essential service on this floor.</p>`;

  const floors = LEVELS.map((floor, index) => {
    const mark = state.cleared.has(String(floor.id)) ? " *" : "";
    return `<button type="button" class="btn ghost${index === state.floor ? " on" : ""}" data-action="floor" data-floor="${index}">${floor.id} ${esc(floor.codename)}${mark}</button>`;
  }).join("");

  const modal = modalMarkup(current);
  const panic = state.phase === "play" && state.countdown <= 5 ? " panic" : "";

  const slot = document.getElementById("floor-slot");
  if (slot) slot.innerHTML = `<div class="floorbar">${floors}</div>`;
  root.innerHTML = `
    <div class="shift" data-testid="motel-shift" data-phase="${state.phase}" data-floor="${current.id}">
      <p class="objective" data-testid="objective"><span class="pixel">${esc(current.codename)}</span> ${esc(current.objective)}</p>
      <div class="layout">
        <div class="board-wrap">
          <div class="board" data-testid="network-board">
            <svg viewBox="0 0 ${BOARD_W} ${BOARD_H}" aria-hidden="true">${zones}${cables}</svg>
            ${switches}
            ${nodeButtons}
          </div>
          <p class="legend"><i class="swatch vuln"></i>vulnerable <i class="swatch safe"></i>patched <i class="swatch cut"></i>cut</p>
        </div>
        <aside class="card panel">
          <h2 class="neon">${esc(current.title)}</h2>
          <p class="pixel">${esc(current.principle)}</p>
          <p class="count${panic}" data-count data-testid="countdown">${Math.max(0, state.countdown)}</p>
          <p class="meta" data-testid="routes">OPEN ROUTES ${esc(routeText)}</p>
          <p class="meta">CUTS ${esc(cutText)}</p>
          ${services}
          <div class="links">${links}</div>
        </aside>
      </div>
      <p class="log" data-testid="log">${esc(state.log)}</p>
      <div class="controls">
        <button type="button" class="btn ghost" data-action="hint">HINT</button>
        <button type="button" class="btn ghost" data-action="reset">RESET</button>
        <button type="button" class="btn ghost" data-action="mute">${isMuted() ? "SOUND ON" : "MUTE"}</button>
        <button type="button" class="btn" data-action="release" data-testid="release-wave" ${state.phase === "play" ? "" : "disabled"}>RELEASE WAVE</button>
      </div>
      <p class="legend">WASD or arrows select a link. E or Space cuts it. Enter runs the wave. H hints. R restarts.</p>
      ${modal}
    </div>`;
  paintTokens();
}

function modalMarkup(current) {
  const back = `<button type="button" class="btn ghost" onclick="AIVice.backToHub()">Back to AI Center</button>`;
  if (state.phase === "intro") {
    const copy = current.intro.map((line) => `<p>${esc(line)}</p>`).join("");
    return `<div class="modal"><div class="card"><p class="pixel">FLOOR ${current.id}</p><h2 class="neon">${esc(current.title)}</h2>${copy}<button type="button" class="btn" data-action="begin" data-testid="start-shift">START SHIFT</button>${back}</div></div>`;
  }
  if (state.phase === "win" && state.outcome) {
    const lines = current.success.map((line) => `<p>${esc(line)}</p>`).join("");
    const pay = state.paid ? `<p class="pixel">+${FLOOR_TOKENS} TOKENS</p>` : `<p>This floor was already paid.</p>`;
    const bonus = state.bonus ? `<p class="pixel">SHIFT COMPLETE +${CLEAR_BONUS} TOKENS</p><ul>${LESSONS.map((line) => `<li>${esc(line)}</li>`).join("")}</ul>` : "";
    const next = nextFloorButton();
    return `<div class="modal"><div class="card"><p class="pixel">CONTAINED</p><h2 class="neon" data-testid="verdict">${esc(current.codename)} SECURE</h2>${lines}${pay}${bonus}${next}${back}</div></div>`;
  }
  if (state.phase === "loss" && state.outcome && state.outcome.type === "loss") {
    const note = current.notes[state.outcome.kind] || "";
    return `<div class="modal"><div class="card"><p class="pixel">${esc(state.outcome.kind)}</p><h2 class="neon" data-testid="verdict">${esc(state.outcome.headline)}</h2><p>${esc(state.outcome.detail)}</p><p>${esc(note)}</p><button type="button" class="btn" data-action="retry" data-testid="retry">TRY AGAIN</button>${back}</div></div>`;
  }
  return "";
}

function nextFloorButton() {
  const nextIndex = LEVELS.findIndex((floor) => !state.cleared.has(String(floor.id)));
  if (nextIndex === -1) return "";
  return `<button type="button" class="btn" data-action="next" data-next="${nextIndex}" data-testid="next-floor">NEXT FLOOR</button>`;
}

function onClick(event) {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const action = target.dataset.action;
  if (action === "toggle" && target.dataset.edge) toggle(target.dataset.edge);
  else if (action === "inspect" && target.dataset.node) inspect(target.dataset.node);
  else if (action === "begin") begin();
  else if (action === "release") release();
  else if (action === "hint") showHint();
  else if (action === "reset" || action === "retry") startFloor(state.floor);
  else if (action === "mute") toggleMute();
  else if (action === "floor") startFloor(Number(target.dataset.floor));
  else if (action === "next") startFloor(Number(target.dataset.next));
}

function onKey(event) {
  const key = event.key.toLowerCase();
  const typing = event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement;
  if (typing || event.metaKey || event.ctrlKey || event.altKey) return;
  if (key === "enter" || key === " " || key.startsWith("arrow")) event.preventDefault();
  if (event.repeat) return;
  if (key === "r") {
    startFloor(state.floor);
    return;
  }
  if (state.phase === "intro") {
    if (key === "enter" || key === " ") begin();
    return;
  }
  if (state.phase === "loss") {
    if (key === "enter" || key === " ") startFloor(state.floor);
    return;
  }
  if (state.phase === "win" && key === "enter") {
    const nextIndex = LEVELS.findIndex((floor) => !state.cleared.has(String(floor.id)));
    if (nextIndex >= 0) startFloor(nextIndex);
    return;
  }
  if (state.phase !== "play") return;
  if (key === "h") {
    showHint();
    return;
  }
  if ((key === "e" || key === " ") && state.selected) {
    toggle(state.selected);
    return;
  }
  if (key === "enter") {
    release();
    return;
  }
  const direction = directionOf(key);
  if (direction) pickEdge(direction.dx, direction.dy);
}

function boot() {
  const ai = window.AIVice;
  if (ai && typeof ai.isMuted === "function" && ai.isMuted()) setMuted(true);
  document.addEventListener("click", onClick);
  window.addEventListener("keydown", onKey);
  clock = window.setInterval(() => {
    if (state.phase !== "play") return;
    state.countdown -= 1;
    const el = document.querySelector("[data-count]");
    if (el) {
      el.textContent = String(Math.max(0, state.countdown));
      el.classList.toggle("panic", state.countdown <= 5);
    }
    if (state.countdown <= 5 && state.countdown > 0) sfx.tick();
    if (state.countdown <= 0) release();
  }, 1000);
  const params = new URLSearchParams(location.search);
  const requested = Number(params.get("floor") || "1");
  const index = LEVELS.findIndex((floor) => floor.id === requested);
  startFloor(index >= 0 ? index : 0);
  paintTokens();
  if (ai && ai.music && typeof ai.music.play === "function") {
    const start = () => {
      try { ai.music.play("challenge"); } catch { /* soundtrack is optional */ }
      window.removeEventListener("pointerdown", start);
    };
    window.addEventListener("pointerdown", start);
  }
}

boot();
