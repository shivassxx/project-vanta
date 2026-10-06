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

describe("CASE_001 vehicle traces", () => {
  it("remembers forcing the sedan's door as a crime, unseen", () => {
    const { state, effects } = play([...start, { type: "crime.committed", at: 50, payload: { actor: "char_a", kind: "vehicle_break_in", witnessed: false } }]);
    expect(state.flags.sedanBrokenInto).toBe(true);
    expect(state.counters.crimes).toBe(1);
    expect(effects.some((e) => e.type === "police.notice")).toBe(false);
  });

  it("sends the police after whoever was seen committing a crime", () => {
    const { state, effects } = play([...start, { type: "crime.committed", at: 50, payload: { actor: "char_b", kind: "dvr_access", witnessed: true } }]);
    expect(state.flags.cafeDvrAccessed).toBe(true);
    expect(effects.at(-1)).toEqual({ type: "police.notice", payload: { characterId: "char_b", reason: "dvr_access", delaySec: 90 } });
  });

  it("records a police plate lookup in the access log", () => {
    const { state } = play([...start, { type: "police.plateLookup", at: 50 }]);
    expect(state.flags.policeLookupLogged).toBe(true);
  });
});

describe("CASE_001 outcomes", () => {
  it("closes as subject_fled when the spooked Subject leaves", () => {
    const { state } = play([
      ...start,
      { type: "subject.noticed", at: 30 },
      { type: "subject.noticed", at: 40 },
      { type: "subject.leftDistrict", at: 80 },
    ]);
    expect(state.outcome).toBe("subject_fled");
  });

  it("goes cold if the team stays too slow after the relocation", () => {
    expect(play([...start, { type: "time", at: 950 }]).state.outcome).toBeUndefined();
    expect(play([...start, { type: "time", at: 950 }, { type: "time", at: 1600 }]).state.outcome).toBe("case_cold");
  });
});
