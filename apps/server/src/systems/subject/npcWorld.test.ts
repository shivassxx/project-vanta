import { CASE_001_CIVILIANS, CASE_001_SUBJECT } from "@vanta/content/server";
import { NpcState } from "@vanta/shared";
import { describe, expect, it } from "vitest";
import { NpcWorld, type SubjectEvent } from "./npcWorld";
import { RING_NODES } from "./ring";

function setup() {
  const events: SubjectEvent[] = [];
  const world = new NpcWorld([CASE_001_SUBJECT, ...CASE_001_CIVILIANS], (e) => events.push(e));
  const npcs = new Map<string, NpcState>();
  world.populate(npcs);
  return { world, npcs, events };
}

const run = (w: ReturnType<typeof setup>, seconds: number, observers: { x: number; z: number }[] = [], sprint = false) => {
  for (let t = 0; t < seconds * 10; t++) w.world.tick(0.1, observers.map((pos) => ({ pos, sprinting: sprint })), w.npcs);
};

describe("NpcWorld", () => {
  it("creates one schema entry per person with opaque ids", () => {
    const { npcs } = setup();
    expect(npcs.size).toBe(1 + CASE_001_CIVILIANS.length);
    for (const id of npcs.keys()) expect(id).toMatch(/^npc_[0-9a-f]{8}$/);
  });

  it("makes the Subject follow the schedule with no observers around", () => {
    const w = setup();
    run(w, 80);
    expect(w.events.some((e) => e.type === "subject.arrived" && e.node === 2)).toBe(true);
    expect(w.events.some((e) => e.type === "subject.noticed")).toBe(false);
    expect(w.world.subjectSuspicion()).toBe(0);
  });

  it("makes the Subject notice a close, persistent observer and change route", () => {
    const w = setup();
    const subject = w.world.subjectPosition();
    if (!subject) throw new Error("no subject");
    run(w, 6, [{ x: subject.x + 1.5, z: subject.z + 1.5 }]);
    const noticed = w.events.filter((e) => e.type === "subject.noticed");
    expect(noticed).toHaveLength(1);
    // After noticing, the Subject retreats to the far side of the ring from the observer.
    run(w, 60);
    const far = RING_NODES[4];
    const pos = w.world.subjectPosition();
    expect(far && pos && Math.hypot(pos.x - far.x, pos.z - far.z) < 20).toBe(true);
  });

  it("does not notice an observer who keeps far away", () => {
    const w = setup();
    run(w, 60, [{ x: 100, z: 100 }]);
    expect(w.events.some((e) => e.type === "subject.noticed")).toBe(false);
  });
});
