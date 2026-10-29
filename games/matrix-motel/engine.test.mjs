// Node port of src/game/engine.test.ts. Runs against the shipped engine.js and levels.js.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
function pick(actual, partial) {
  if (partial && typeof partial === "object" && !Array.isArray(partial)) {
    const out = {};
    for (const key of Object.keys(partial)) out[key] = pick(actual == null ? void 0 : actual[key], partial[key]);
    return out;
  }
  return actual;
}
function expect(actual) {
  return {
    toBe(expected) {
      assert.equal(actual, expected);
    },
    toEqual(expected) {
      assert.deepEqual(actual, expected);
    },
    toContain(item) {
      assert.ok(
        (typeof actual === "string" || Array.isArray(actual)) && actual.includes(item),
        `expected ${JSON.stringify(actual)} to contain ${JSON.stringify(item)}`
      );
    },
    toMatchObject(partial) {
      assert.deepEqual(pick(actual, partial), partial);
    },
    get not() {
      return {
        toContain(item) {
          assert.ok(
            (typeof actual === "string" || Array.isArray(actual)) && !actual.includes(item),
            `expected ${JSON.stringify(actual)} not to contain ${JSON.stringify(item)}`
          );
        }
      };
    }
  };
}

import { attackRoutes, propagate, simulate, validateLevel } from "./engine.js";
import { LEVELS } from "./levels.js";
function node(id, extra = {}) {
  return {
    id,
    code: id.toUpperCase(),
    label: id,
    x: 0,
    y: 0,
    kind: "pc",
    ...extra
  };
}
function toy(partial) {
  return {
    id: 0,
    codename: "TOY",
    title: "TOY",
    objective: "test",
    principle: "test",
    countdown: 10,
    maxCuts: null,
    zones: [],
    intro: ["test"],
    hint: "test",
    success: ["test"],
    notes: { compromised: "c", outage: "o" },
    ...partial
  };
}
function setsOf(ids, maxSize) {
  const out = [[]];
  for (const id of ids) {
    const next = out.map((set) => [...set, id]);
    out.push(...next);
  }
  return out.filter((set) => set.length <= maxSize && set.length > 0);
}
function winningKeys(level, budget) {
  return setsOf(
    level.edges.map((edge) => edge.id),
    budget
  ).filter((cuts) => simulate(level, cuts).verdict.type === "win").map((cuts) => [...cuts].sort().join("+")).sort();
}
describe("attack routes", () => {
  it("counts edge-disjoint vulnerable paths and ignores patched links", () => {
    const level = toy({
      infected: ["i"],
      essentials: [],
      nodes: [node("i"), node("a"), node("b"), node("p", { protected: true })],
      edges: [
        { id: "ia", a: "i", b: "a", label: "ia", vulnerable: true, group: "t" },
        { id: "ib", a: "i", b: "b", label: "ib", vulnerable: true, group: "t" },
        { id: "ap", a: "a", b: "p", label: "ap", vulnerable: true, group: "t" },
        { id: "bp", a: "b", b: "p", label: "bp", vulnerable: true, group: "t" },
        { id: "hard", a: "a", b: "p", label: "hard", vulnerable: false, group: "t" }
      ]
    });
    const infected = /* @__PURE__ */ new Set(["i"]);
    expect(attackRoutes(level, infected, /* @__PURE__ */ new Set())).toBe(2);
    expect(attackRoutes(level, infected, /* @__PURE__ */ new Set(["ia"]))).toBe(1);
    expect(attackRoutes(level, infected, /* @__PURE__ */ new Set(["ia", "ib"]))).toBe(0);
  });
  it("does not double-count a single undirected cable", () => {
    const level = toy({
      infected: ["i"],
      essentials: [],
      nodes: [node("i"), node("p", { protected: true })],
      edges: [{ id: "only", a: "i", b: "p", label: "only", vulnerable: true, group: "t" }]
    });
    expect(attackRoutes(level, /* @__PURE__ */ new Set(["i"]), /* @__PURE__ */ new Set())).toBe(1);
    expect(attackRoutes(level, /* @__PURE__ */ new Set(["i"]), /* @__PURE__ */ new Set(["only"]))).toBe(0);
  });
});
describe("propagation", () => {
  it("spreads one hop through enabled vulnerable links and stops on cuts and patches", () => {
    const level = LEVELS[2];
    if (!level) throw new Error("missing floor 3");
    const open = propagate(level, /* @__PURE__ */ new Set(["guest"]), /* @__PURE__ */ new Set());
    expect(open.events.map((event) => event.node)).toEqual(["ap"]);
    const cut = propagate(level, /* @__PURE__ */ new Set(["guest"]), /* @__PURE__ */ new Set(["drop"]));
    expect(cut.events).toEqual([]);
    const patched = propagate(level, /* @__PURE__ */ new Set(["pay"]), /* @__PURE__ */ new Set(["pfeed"]));
    expect(patched.events.map((event) => event.node)).not.toContain("core");
    expect(simulate(level, ["drop"]).verdict.type).toBe("win");
  });
  it("moves both breaches on the final floor in one wave", () => {
    const level = LEVELS[4];
    if (!level) throw new Error("missing floor 5");
    const step = propagate(level, /* @__PURE__ */ new Set(["guest", "kiosk"]), /* @__PURE__ */ new Set());
    expect(step.events.map((event) => event.node).sort()).toEqual(["desk", "eap", "fw", "tv"]);
  });
});
describe("floors", () => {
  it("validates every floor definition", () => {
    for (const level of LEVELS) {
      expect(validateLevel(level)).toEqual([]);
    }
  });
  it("rejects a fully disconnected motel when services must stay up", () => {
    for (const level of LEVELS) {
      const all = level.edges.map((edge) => edge.id);
      const result = simulate(level, all);
      if (level.essentials.length > 0) {
        expect(result.verdict.type).toBe("loss");
        if (result.verdict.type === "loss") expect(result.verdict.kind).toBe("outage");
      } else {
        expect(result.verdict.type).toBe("win");
      }
    }
  });
  it("teaches a single exposed link on floor 1", () => {
    const level = LEVELS[0];
    if (!level) throw new Error("missing floor 1");
    expect(simulate(level, []).verdict.type).toBe("loss");
    expect(simulate(level, ["exposed"]).verdict.type).toBe("win");
    expect(simulate(level, ["uplink"]).verdict.type).toBe("win");
    expect(attackRoutes(level, /* @__PURE__ */ new Set(["guest"]), /* @__PURE__ */ new Set())).toBe(1);
    expect(attackRoutes(level, /* @__PURE__ */ new Set(["guest"]), /* @__PURE__ */ new Set(["exposed"]))).toBe(0);
  });
  it("requires both routes on floor 2 and ignores the printer dead end", () => {
    const level = LEVELS[1];
    if (!level) throw new Error("missing floor 2");
    const infected = /* @__PURE__ */ new Set(["room"]);
    expect(attackRoutes(level, infected, /* @__PURE__ */ new Set())).toBe(2);
    expect(attackRoutes(level, infected, /* @__PURE__ */ new Set(["decoy"]))).toBe(2);
    expect(attackRoutes(level, infected, /* @__PURE__ */ new Set(["north"]))).toBe(1);
    expect(attackRoutes(level, infected, /* @__PURE__ */ new Set(["north", "southup"]))).toBe(0);
    expect(simulate(level, ["north"]).verdict.type).toBe("loss");
    expect(simulate(level, ["decoy", "north"]).verdict.type).toBe("loss");
    expect(simulate(level, ["north", "southup"]).verdict.type).toBe("win");
    expect(simulate(level, ["north", "southup", "decoy"]).verdict.type).toBe("win");
    expect(winningKeys(level, 2)).toEqual([
      "mid+north",
      "mid+northup",
      "north+south",
      "north+southup",
      "northup+south",
      "northup+southup"
    ]);
  });
  it("fails floor 3 when the threat is stopped by killing the business", () => {
    const level = LEVELS[2];
    if (!level) throw new Error("missing floor 3");
    expect(simulate(level, []).verdict).toMatchObject({ type: "loss", kind: "compromised" });
    expect(simulate(level, ["drop"]).verdict.type).toBe("win");
    expect(simulate(level, ["pfeed", "cfeed", "afeed"]).verdict.type).toBe("win");
    const outage = simulate(level, ["drop", "psafe"]);
    expect(outage.verdict).toMatchObject({
      type: "loss",
      kind: "outage",
      headline: "PAYMENT SYSTEM OFFLINE"
    });
    expect(simulate(level, ["psafe", "csafe"]).verdict.type).toBe("loss");
    expect(attackRoutes(level, /* @__PURE__ */ new Set(["guest"]), /* @__PURE__ */ new Set(["psafe"]))).toBe(1);
  });
  it("accepts only the west-wing boundary on floor 4", () => {
    const level = LEVELS[3];
    if (!level) throw new Error("missing floor 4");
    expect(attackRoutes(level, /* @__PURE__ */ new Set(["r4"]), /* @__PURE__ */ new Set())).toBe(2);
    expect(simulate(level, ["northb"]).verdict.type).toBe("loss");
    expect(simulate(level, ["r4ap", "r4r5"]).verdict.type).toBe("loss");
    expect(simulate(level, ["northb", "southb"]).verdict.type).toBe("win");
    expect(winningKeys(level, 2)).toEqual(["northb+southb"]);
    expect(winningKeys(level, 1)).toEqual([]);
  });
  it("accepts only the three secure crossings on floor 5", () => {
    const level = LEVELS[4];
    if (!level) throw new Error("missing floor 5");
    const infected = /* @__PURE__ */ new Set(["guest", "kiosk"]);
    expect(attackRoutes(level, infected, /* @__PURE__ */ new Set())).toBe(3);
    expect(attackRoutes(level, infected, /* @__PURE__ */ new Set(["rogue"]))).toBe(2);
    expect(attackRoutes(level, infected, /* @__PURE__ */ new Set(["rogue", "fsw"]))).toBe(1);
    expect(attackRoutes(level, infected, /* @__PURE__ */ new Set(["rogue", "fsw", "dsw"]))).toBe(0);
    expect(simulate(level, ["rogue", "fsw"]).verdict.type).toBe("loss");
    expect(simulate(level, ["tpay", "tcam", "tvault"]).verdict.type).toBe("loss");
    expect(simulate(level, ["rogue", "fsw", "dsw"]).verdict.type).toBe("win");
    expect(simulate(level, ["rogue", "fsw", "kdesk"]).verdict.type).toBe("win");
    expect(simulate(level, ["spay", "scam", "sbook"]).verdict).toMatchObject({
      type: "loss",
      kind: "compromised"
    });
    expect(winningKeys(level, 2)).toEqual([]);
    expect(winningKeys(level, 3)).toEqual(["dsw+fsw+rogue", "fsw+kdesk+rogue"]);
  });
  it("is deterministic and names the cable that failed", () => {
    const level = LEVELS[0];
    if (!level) throw new Error("missing floor 1");
    const first = simulate(level, []);
    const second = simulate(level, []);
    expect(second).toEqual(first);
    expect(first.verdict.type).toBe("loss");
    if (first.verdict.type === "loss") {
      expect(first.verdict.headline).toContain("SECURITY SERVER");
      expect(first.verdict.detail).toContain("SERVER UPLINK");
    }
  });
});
