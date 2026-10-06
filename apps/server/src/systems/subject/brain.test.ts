import { describe, expect, it } from "vitest";
import type { Stop } from "@vanta/content/server";
import { Brain, type BrainEvent } from "./brain";
import { RING_NODES } from "./ring";

const plan: Stop[] = [
  { node: 0, dwellSec: 5, note: "a" },
  { node: 2, dwellSec: 5, note: "b" },
  { node: 4, dwellSec: 5, note: "c" },
];

function run(brain: Brain, seconds: number, events: BrainEvent[] = []): BrainEvent[] {
  for (let t = 0; t < seconds * 10; t++) brain.tick(0.1, (e) => events.push(e));
  return events;
}

describe("Brain", () => {
  it("stays put during the first dwell, then walks to the next stop", () => {
    const b = new Brain(0, plan, 2);
    run(b, 4);
    expect(b.moving).toBe(false);
    expect(b.pos).toEqual(RING_NODES[0]);
    const events = run(b, 3);
    expect(events[0]).toMatchObject({ type: "departed", node: 2 });
    expect(b.moving).toBe(true);
  });

  it("arrives at each stop in plan order and loops", () => {
    const b = new Brain(0, plan, 6);
    const events = run(b, 60);
    const arrivals = events.filter((e) => e.type === "arrived").map((e) => e.node);
    expect(arrivals.slice(0, 4)).toEqual([2, 4, 0, 2]);
  });

  it("walks at the configured speed", () => {
    const b = new Brain(0, plan, 2);
    run(b, 5.5); // dwell over after 5 s, then 0.5 s of walking
    const start = RING_NODES[0];
    if (!start) throw new Error("no node");
    expect(Math.hypot(b.pos.x - start.x, b.pos.z - start.z)).toBeCloseTo(1, 0);
  });

  it("evading retreats to the far side, hurries, and skips the next planned stop", () => {
    const b = new Brain(0, plan, 2);
    run(b, 6); // walking toward node 2
    const events: BrainEvent[] = [];
    b.evade({ x: -9, z: 9 }, (e) => events.push(e));
    expect(b.mode).toBe("evading");
    expect(events[0]).toEqual({ type: "evade", node: 4 });
    run(b, 40, events);
    expect(events.some((e) => e.type === "arrived" && e.node === 4)).toBe(true);
    expect(b.mode).toBe("routine");
    // Planned stop 2 (index 1) was skipped; the next destination is node 4 -> then node 0.
    const departures = events.filter((e) => e.type === "departed").map((e) => e.node);
    expect(departures).not.toContain(2);
  });
});
