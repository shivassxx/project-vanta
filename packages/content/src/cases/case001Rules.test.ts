import { createCaseState, dispatch, validateCaseDef, type CaseEvent, type CaseState, type Effect } from "@vanta/case-engine";
import { describe, expect, it } from "vitest";
import { CASE_001_ITEMS } from "./case001";
import { CASE_001_RULES } from "./case001Rules";
import { CASE_001_SUBJECT } from "./case001Secret";

function play(events: CaseEvent[]) {
  let state: CaseState = createCaseState(CASE_001_RULES);
  const effects: Effect[] = [];
  for (const e of events) {
    const r = dispatch(CASE_001_RULES, state, e);
    state = r.state;
    effects.push(...r.effects);
  }
  return { state, effects };
}

const start: CaseEvent[] = [
  { type: "igl.designated", at: 0 },
  { type: "time", at: 5 },
];

describe("CASE_001 rules", () => {
  it("is valid content", () => {
    expect(validateCaseDef(CASE_001_RULES)).toEqual([]);
  });

  it("only delivers items that exist", () => {
    const { effects } = play([...start, { type: "time", at: 1000 }]);
    const ids = effects.filter((e) => e.type === "vanta.deliver").flatMap((e) => e.payload?.items as string[]);
    expect(ids.length).toBeGreaterThan(4);
    for (const id of ids) expect(CASE_001_ITEMS.has(id)).toBe(true);
  });

  it("sends the first signal a few seconds after designation", () => {
    const { state, effects } = play(start);
    expect(state.stage).toBe("locate");
    expect(effects[0]?.type).toBe("vanta.deliver");
  });

  it("makes the Subject wary after one notice and spooked after two", () => {
    const once = play([...start, { type: "subject.noticed", at: 30 }]);
    expect(once.state.stage).toBe("wary");
    const twice = play([...start, { type: "subject.noticed", at: 30 }, { type: "subject.noticed", at: 60 }]);
    expect(twice.state.stage).toBe("spooked");
    expect(twice.effects.filter((e) => e.type === "subject.alert").map((e) => e.payload?.level)).toEqual(["wary", "spooked"]);
    expect(twice.state.timers).toEqual([]);
  });

  it("relocates the Subject if the team is too slow", () => {
    const { state, effects } = play([...start, { type: "time", at: 950 }]);
    expect(state.stage).toBe("relocated");
    expect(state.flags.subjectRelocated).toBe(true);
    expect(effects.at(-1)).toEqual({ type: "vanta.deliver", payload: { items: ["case001.subject.locationUpdate"] } });
  });

  it("records the park meeting from the Subject's real schedule note", () => {
    const parkNote = CASE_001_SUBJECT.plan.find((s) => s.note.startsWith("park"))?.note;
    const { state } = play([...start, { type: "subject.arrived", at: 100, payload: { note: parkNote ?? "" } }]);
    expect(state.flags.parkMeetingHappened).toBe(true);
  });
});
