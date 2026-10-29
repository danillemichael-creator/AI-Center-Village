/**
 * Plain JavaScript port of src/game/engine.ts. The static page imports this file; there is no build step.
 */
function nodeById(level, id) {
  const node = level.nodes.find((n) => n.id === id);
  if (!node) throw new Error(`Missing node ${id} on floor ${level.id}`);
  return node;
}
function edgeById(level, id) {
  const edge = level.edges.find((e) => e.id === id);
  if (!edge) throw new Error(`Missing link ${id} on floor ${level.id}`);
  return edge;
}
function otherEnd(edge, id) {
  return edge.a === id ? edge.b : edge.a;
}
function propagate(level, infected, disabled) {
  const events = [];
  const next = new Set(infected);
  const sources = [...infected].sort();
  const edges = [...level.edges].sort((a, b) => a.id.localeCompare(b.id));
  for (const id of sources) {
    for (const edge of edges) {
      if (edge.a !== id && edge.b !== id) continue;
      if (!edge.vulnerable || disabled.has(edge.id)) continue;
      const dest = otherEnd(edge, id);
      if (next.has(dest)) continue;
      next.add(dest);
      events.push({ node: dest, from: id, edge: edge.id });
    }
  }
  return { next, events };
}
function blockedAttempts(level, infected, disabled) {
  const blocks = [];
  const edges = [...level.edges].sort((a, b) => a.id.localeCompare(b.id));
  for (const id of [...infected].sort()) {
    for (const edge of edges) {
      if (edge.a !== id && edge.b !== id) continue;
      if (!edge.vulnerable || !disabled.has(edge.id)) continue;
      const dest = otherEnd(edge, id);
      if (infected.has(dest)) continue;
      blocks.push({ edge: edge.id, from: id, to: dest });
    }
  }
  return blocks;
}
function reaches(level, disabled, start, goal) {
  if (start === goal) return true;
  const seen = /* @__PURE__ */ new Set([start]);
  const queue = [start];
  while (queue.length) {
    const current = queue.shift();
    if (!current) break;
    for (const edge of level.edges) {
      if (edge.a !== current && edge.b !== current) continue;
      if (edge.vulnerable || disabled.has(edge.id)) continue;
      const next = otherEnd(edge, current);
      if (seen.has(next)) continue;
      if (next === goal) return true;
      seen.add(next);
      queue.push(next);
    }
  }
  return false;
}
function serviceStatus(level, disabled) {
  return level.essentials.map((item) => ({
    id: item.service,
    name: item.name,
    serviceLabel: nodeById(level, item.service).label,
    anchorLabel: nodeById(level, item.anchor).label,
    ok: reaches(level, disabled, item.service, item.anchor)
  }));
}
function forecast(level, infected, disabled) {
  const seen = new Set(infected);
  const queue = [...infected];
  while (queue.length) {
    const current = queue.shift();
    if (!current) break;
    const { events } = propagate(level, /* @__PURE__ */ new Set([current]), disabled);
    for (const event of events) {
      if (seen.has(event.node)) continue;
      seen.add(event.node);
      queue.push(event.node);
    }
  }
  return seen;
}
function attackRoutes(level, infected, disabled) {
  const shielded = level.nodes.filter((node) => node.protected).map((node) => node.id);
  for (const id of infected) {
    if (shielded.includes(id)) return Number.POSITIVE_INFINITY;
  }
  if (shielded.length === 0 || infected.size === 0) return 0;
  const source = "#S";
  const sink = "#T";
  const residual = /* @__PURE__ */ new Map();
  const add = (from, to, capacity) => {
    if (!residual.has(from)) residual.set(from, /* @__PURE__ */ new Map());
    if (!residual.has(to)) residual.set(to, /* @__PURE__ */ new Map());
    const row = residual.get(from);
    if (!row) return;
    row.set(to, (row.get(to) ?? 0) + capacity);
    const back = residual.get(to);
    if (back && !back.has(from)) back.set(from, 0);
  };
  for (const id of infected) add(source, id, 1e6);
  for (const id of shielded) add(id, sink, 1e6);
  for (const edge of level.edges) {
    if (!edge.vulnerable || disabled.has(edge.id)) continue;
    add(edge.a, edge.b, 1);
    add(edge.b, edge.a, 1);
  }
  let flow = 0;
  for (; ; ) {
    const previous = /* @__PURE__ */ new Map();
    const queue = [source];
    previous.set(source, source);
    for (let index = 0; index < queue.length; index += 1) {
      const current = queue[index];
      if (!current) continue;
      for (const [next, capacity] of residual.get(current) ?? []) {
        if (capacity > 0 && !previous.has(next)) {
          previous.set(next, current);
          queue.push(next);
        }
      }
    }
    if (!previous.has(sink)) break;
    let bottleneck = Number.POSITIVE_INFINITY;
    for (let node = sink; node !== source; ) {
      const prev = previous.get(node);
      if (!prev) break;
      bottleneck = Math.min(bottleneck, residual.get(prev)?.get(node) ?? 0);
      node = prev;
    }
    for (let node = sink; node !== source; ) {
      const prev = previous.get(node);
      if (!prev) break;
      const forward = residual.get(prev);
      const backward = residual.get(node);
      if (forward) forward.set(node, (forward.get(node) ?? 0) - bottleneck);
      if (backward) backward.set(prev, (backward.get(prev) ?? 0) + bottleneck);
      node = prev;
    }
    flow += bottleneck;
    if (flow > level.edges.length + 1) break;
  }
  return flow;
}
function pathEdgesTo(level, infected, disabled, target) {
  const adjacent = /* @__PURE__ */ new Map();
  for (const edge of level.edges) {
    if (!edge.vulnerable || disabled.has(edge.id)) continue;
    const left = adjacent.get(edge.a) ?? [];
    left.push({ id: edge.id, to: edge.b });
    adjacent.set(edge.a, left);
    const right = adjacent.get(edge.b) ?? [];
    right.push({ id: edge.id, to: edge.a });
    adjacent.set(edge.b, right);
  }
  const found = /* @__PURE__ */ new Set();
  const walk = (node, seen) => {
    if (node === target) return true;
    let hit = false;
    for (const link of adjacent.get(node) ?? []) {
      if (seen.has(link.to)) continue;
      seen.add(link.to);
      if (walk(link.to, seen)) {
        found.add(link.id);
        hit = true;
      }
      seen.delete(link.to);
    }
    return hit;
  };
  for (const start of infected) {
    if (start === target) continue;
    walk(start, /* @__PURE__ */ new Set([start]));
  }
  return found;
}
function explainHit(level, infected, disabled, nodeId) {
  const node = nodeById(level, nodeId);
  const edges = [...level.edges].sort((a, b) => a.id.localeCompare(b.id));
  for (const edge of edges) {
    if (edge.a !== nodeId && edge.b !== nodeId) continue;
    if (!edge.vulnerable || disabled.has(edge.id)) continue;
    const from = otherEnd(edge, nodeId);
    if (!infected.has(from)) continue;
    const source = nodeById(level, from);
    return `GHOST moved from ${source.label} across ${edge.label}. That vulnerable link was still open, so ${node.label} was reachable.`;
  }
  return `${node.label} was compromised through an open vulnerable path.`;
}
function judge(level, infected, disabled) {
  const hit = level.nodes.filter((node) => node.protected && infected.has(node.id)).sort((a, b) => a.label.localeCompare(b.label));
  if (hit.length) {
    const names = hit.map((node) => node.label).join(" AND ");
    const detail = hit.map((node) => explainHit(level, infected, disabled, node.id)).join(" ");
    const down2 = serviceStatus(level, disabled).filter((item) => !item.ok);
    const extra = down2.length > 0 ? ` ${down2.map((item) => item.name).join(" AND ")} also lost connectivity.` : "";
    return {
      type: "loss",
      kind: "compromised",
      headline: `${names} COMPROMISED`,
      detail: `${detail}${extra}`
    };
  }
  if (propagate(level, infected, disabled).events.length > 0) {
    return { type: "ongoing" };
  }
  const down = serviceStatus(level, disabled).filter((item) => !item.ok);
  if (down.length) {
    const headline = down.length === 1 ? `${down[0]?.name ?? "SERVICE"} OFFLINE` : `${down.map((item) => item.name).join(" AND ")} OFFLINE`;
    const detail = down.length === 1 && down[0] ? `You've blocked the threat, but ${down[0].serviceLabel} can no longer reach ${down[0].anchorLabel}.` : `You've blocked the threat, but ${down.map((item) => item.serviceLabel).join(" and ")} can no longer reach the central server.`;
    return { type: "loss", kind: "outage", headline, detail };
  }
  return { type: "win" };
}
function simulate(level, cuts) {
  let infected = new Set(level.infected);
  const disabled = new Set(cuts);
  const trace = [];
  const limit = level.nodes.length + 2;
  for (let wave = 0; wave < limit; wave += 1) {
    const verdict = judge(level, infected, disabled);
    if (verdict.type !== "ongoing") {
      return { verdict, infected: [...infected].sort(), waves: wave, trace };
    }
    const step = propagate(level, infected, disabled);
    trace.push(...step.events);
    infected = step.next;
  }
  return {
    verdict: judge(level, infected, disabled),
    infected: [...infected].sort(),
    waves: -1,
    trace
  };
}
function validateLevel(level) {
  const errors = [];
  const ids = /* @__PURE__ */ new Set();
  for (const node of level.nodes) {
    if (ids.has(node.id)) errors.push(`duplicate node ${node.id}`);
    ids.add(node.id);
  }
  const edgeIds = /* @__PURE__ */ new Set();
  for (const edge of level.edges) {
    if (edgeIds.has(edge.id)) errors.push(`duplicate link ${edge.id}`);
    edgeIds.add(edge.id);
    if (!ids.has(edge.a) || !ids.has(edge.b)) errors.push(`link ${edge.id} has a missing endpoint`);
    if (edge.a === edge.b) errors.push(`link ${edge.id} loops`);
  }
  for (const id of level.infected) {
    if (!ids.has(id)) {
      errors.push(`unknown breach ${id}`);
      continue;
    }
    if (nodeById(level, id).protected) errors.push(`${id} starts compromised and shielded`);
  }
  for (const item of level.essentials) {
    if (!ids.has(item.service) || !ids.has(item.anchor)) {
      errors.push(`bad service ${item.name}`);
      continue;
    }
    if (!nodeById(level, item.service).essential) errors.push(`${item.service} is not marked essential`);
    if (!nodeById(level, item.service).protected) errors.push(`${item.service} essential is not shielded`);
    if (!nodeById(level, item.anchor).protected) errors.push(`${item.anchor} is not shielded`);
  }
  if (level.spotlight && !edgeIds.has(level.spotlight)) errors.push("spotlight link is missing");
  if (level.maxCuts !== null && level.maxCuts < 1) errors.push("cut budget is empty");
  if (level.spotlight) edgeById(level, level.spotlight);
  return errors;
}
export {
  attackRoutes,
  blockedAttempts,
  forecast,
  judge,
  otherEnd,
  pathEdgesTo,
  propagate,
  reaches,
  serviceStatus,
  simulate,
  validateLevel
};
