import { CASE_001_CIVILIANS, CASE_001_SUBJECT, CASE_001_WITNESSES } from "@vanta/content/server";
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

describe("NpcWorld people", () => {
  it("keeps witnesses at their workplace", () => {
    const events: SubjectEvent[] = [];
    const world = new NpcWorld(undefined, (e) => events.push(e));
    const npcs = new Map<string, NpcState>();
    world.populate(npcs);
    for (let t = 0; t < 600; t++) world.tick(0.1, [], npcs);
    const standing = CASE_001_WITNESSES.map((w) => w.standAt);
    for (const pos of standing) expect([...npcs.values()].some((n) => n.x === pos?.x && n.z === pos?.z)).toBe(true);
  });

  it("makes the Subject notice anyone who talks to them", () => {
    const events: SubjectEvent[] = [];
    const world = new NpcWorld([CASE_001_SUBJECT], (e) => events.push(e));
    const npcs = new Map<string, NpcState>();
    world.populate(npcs);
    const [id] = [...npcs.keys()];
    if (!id) throw new Error("no npc");
    expect(world.find(id)?.conversation).toBe("subject");
    world.confront(id, { x: -8, z: 9 });
    expect(events.map((e) => e.type)).toEqual(["subject.noticed"]);
  });
});

describe("NpcWorld consequences", () => {
  it("lets the Subject leave the district and removes them from the world", () => {
    const events: SubjectEvent[] = [];
    const world = new NpcWorld([CASE_001_SUBJECT, ...CASE_001_CIVILIANS], (e) => events.push(e));
    const npcs = new Map<string, NpcState>();
    world.populate(npcs);
    world.subjectLeave();
    for (let t = 0; t < 400; t++) world.tick(0.1, [], npcs);
    expect(events.at(-1)).toEqual({ type: "subject.leftDistrict", key: "subject" });
    expect(npcs.size).toBe(CASE_001_CIVILIANS.length);
    expect(world.subjectPosition()).toBeUndefined();
  });

  it("does not spawn people the campaign remembers as gone", () => {
    const world = new NpcWorld([CASE_001_SUBJECT, ...CASE_001_CIVILIANS], undefined, (key) => (key === "subject" ? "gone" : "present"));
    expect(world.subjectPosition()).toBeUndefined();
  });

  it("finds witnesses in range with a clear line of sight", () => {
    const world = new NpcWorld([CASE_001_WITNESSES[0] ?? CASE_001_SUBJECT]);
    const at = CASE_001_WITNESSES[0]?.standAt ?? { x: 0, z: 0 };
    const wall = { minX: at.x - 5, maxX: at.x + 5, minZ: at.z - 2.5, maxZ: at.z - 2 };
    expect(world.witnessesNear({ x: at.x, z: at.z - 4 }, 8, [])).toBe(true);
    expect(world.witnessesNear({ x: at.x, z: at.z - 4 }, 8, [wall])).toBe(false);
    expect(world.witnessesNear({ x: at.x, z: at.z - 20 }, 8, [])).toBe(false);
  });
});
