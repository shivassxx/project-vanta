import { describe, expect, it } from "vitest";
import { evaluate } from "./conditions";
import { createCaseState, dispatch, nextTimerAt } from "./engine";
import type { CaseDef, CaseEvent, CaseState } from "./types";
import { validateCaseDef } from "./validate";

/** Small branching case used to exercise the engine. */
const def: CaseDef = {
  id: "test_case",
  initialStage: "start",
  rules: [
    { id: "begin", on: "signal", do: [{ setStage: "active" }, { startTimer: "deadline", afterSec: 100 }] },
    { id: "on_active", on: "stage:active", do: [{ effect: { type: "vanta.deliver", payload: { items: ["a", "b"] } } }] },
    { id: "spotted", on: "noticed", once: false, when: { stage: "active" }, do: [{ increment: "noticed" }] },
    {
      id: "spooked",
      on: "noticed",
      when: { counter: "noticed", gte: 2 },
      do: [{ setStage: "spooked" }, { cancelTimer: "deadline" }],
    },
    { id: "found_photo", on: "evidence", when: { payload: "id", equals: "photo" }, do: [{ setFlag: "hasPhoto", value: true }] },
    { id: "late", on: "timer:deadline", do: [{ setOutcome: "too_late" }] },
    { id: "resolve_good", on: "intervene", when: { all: [{ flag: "hasPhoto", equals: true }, { not: { stage: "spooked" } }] }, do: [{ setOutcome: "prevented" }] },
    { id: "resolve_bad", on: "intervene", when: { stage: "spooked" }, do: [{ setOutcome: "escaped" }] },
  ],
};

function play(events: CaseEvent[], state: CaseState = createCaseState(def)) {
  const effects = [];
  const fired: string[] = [];
  for (const e of events) {
    const r = dispatch(def, state, e);
    state = r.state;
    effects.push(...r.effects);
    fired.push(...r.fired);
  }
  return { state, effects, fired };
}

describe("dispatch", () => {
  it("changes stage, emits stage events and their effects", () => {
    const r = play([{ type: "signal", at: 0 }]);
    expect(r.state.stage).toBe("active");
    expect(r.fired).toEqual(["begin", "on_active"]);
    expect(r.effects).toEqual([{ type: "vanta.deliver", payload: { items: ["a", "b"] } }]);
    expect(nextTimerAt(r.state)).toBe(100);
  });

  it("fires once-rules only once and repeatable rules every time", () => {
    const r = play([{ type: "signal", at: 0 }, { type: "signal", at: 1 }, { type: "noticed", at: 2 }]);
    expect(r.fired.filter((f) => f === "begin")).toHaveLength(1);
    expect(r.state.counters.noticed).toBe(1);
  });

  it("branches: careful players with the photo prevent it", () => {
    const r = play([{ type: "signal", at: 0 }, { type: "evidence", at: 5, payload: { id: "photo" } }, { type: "intervene", at: 10 }]);
    expect(r.state.outcome).toBe("prevented");
  });

  it("branches: being noticed twice spooks the Subject and cancels the deadline", () => {
    const r = play([{ type: "signal", at: 0 }, { type: "noticed", at: 5 }, { type: "noticed", at: 6 }, { type: "intervene", at: 7 }]);
    expect(r.state.stage).toBe("spooked");
    expect(r.state.timers).toEqual([]);
    expect(r.state.outcome).toBe("escaped");
  });

  it("fires due timers from the passage of time", () => {
    const r = play([{ type: "signal", at: 0 }, { type: "time", at: 99 }, { type: "time", at: 101 }]);
    expect(r.state.outcome).toBe("too_late");
    expect(r.effects).toContainEqual({ type: "case.outcome", payload: { outcome: "too_late" } });
  });

  it("ignores everything after an outcome", () => {
    const r = play([{ type: "signal", at: 0 }, { type: "time", at: 200 }, { type: "evidence", at: 201, payload: { id: "photo" } }]);
    expect(r.state.flags.hasPhoto).toBeUndefined();
  });

  it("does not mutate the input state", () => {
    const s = createCaseState(def);
    const snapshot = JSON.stringify(s);
    dispatch(def, s, { type: "signal", at: 0 });
    expect(JSON.stringify(s)).toBe(snapshot);
  });

  it("produces JSON-serializable state that survives a round trip", () => {
    const { state } = play([{ type: "signal", at: 0 }, { type: "noticed", at: 1 }]);
    const restored = JSON.parse(JSON.stringify(state)) as CaseState;
    const a = dispatch(def, state, { type: "noticed", at: 2 });
    const b = dispatch(def, restored, { type: "noticed", at: 2 });
    expect(b).toEqual(a);
  });

  it("stops runaway cascades", () => {
    const loop: CaseDef = {
      id: "loop",
      initialStage: "a",
      rules: [
        { id: "ab", on: "stage:a", once: false, do: [{ setStage: "b" }] },
        { id: "ba", on: "stage:b", once: false, do: [{ setStage: "a" }] },
        { id: "go", on: "go", do: [{ setStage: "b" }] },
      ],
    };
    expect(() => dispatch(loop, createCaseState(loop), { type: "go", at: 0 })).toThrow(/cascade/);
  });
});

describe("evaluate", () => {
  const s = { ...createCaseState(def), flags: { x: 1 }, counters: { n: 3 } };
  const e: CaseEvent = { type: "t", at: 0, payload: { k: "v" } };
  it("handles every condition kind", () => {
    expect(evaluate({ flagSet: "x" }, s, e)).toBe(true);
    expect(evaluate({ counter: "n", gte: 3, lte: 3, eq: 3 }, s, e)).toBe(true);
    expect(evaluate({ counter: "missing", eq: 0 }, s, e)).toBe(true);
    expect(evaluate({ stageIn: ["start", "x"] }, s, e)).toBe(true);
    expect(evaluate({ payload: "k", equals: "v" }, s, e)).toBe(true);
    expect(evaluate({ any: [{ flag: "x", equals: 2 }, { not: { flagSet: "y" } }] }, s, e)).toBe(true);
  });
});

describe("validateCaseDef", () => {
  it("accepts the test case", () => {
    expect(validateCaseDef(def)).toEqual([]);
  });

  it("reports duplicate ids, unknown stages and never-started timers", () => {
    const bad: CaseDef = {
      id: "bad",
      initialStage: "s",
      rules: [
        { id: "r", on: "x", do: [{ setFlag: "a", value: 1 }] },
        { id: "r", on: "timer:nope", do: [{ setFlag: "a", value: 1 }] },
        { id: "q", on: "stage:ghost", when: { stage: "ghost2" }, do: [] },
      ],
    };
    const p = validateCaseDef(bad);
    expect(p).toContain("duplicate rule id r");
    expect(p).toContain("rule r waits for timer nope that is never started");
    expect(p).toContain("rule q waits for unknown stage ghost");
    expect(p).toContain("rule q checks unknown stage ghost2");
    expect(p).toContain("rule q has no actions");
  });
});
