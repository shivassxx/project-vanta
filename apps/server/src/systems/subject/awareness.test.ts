import { describe, expect, it } from "vitest";
import { Awareness } from "./awareness";

// Subject at origin facing -Z (yaw 0).
const self = { x: 0, z: 0 };
const run = (a: Awareness, seconds: number, observer: { x: number; z: number }, sprinting = false) => {
  let culprit;
  for (let t = 0; t < seconds * 10; t++) culprit = a.update(0.1, self, 0, [{ pos: observer, sprinting }]) ?? culprit;
  return culprit;
};

describe("Awareness", () => {
  it("does not notice someone far away", () => {
    expect(run(new Awareness(), 60, { x: 0, z: -30 })).toBeUndefined();
  });

  it("notices someone standing close for a few seconds, even behind", () => {
    expect(run(new Awareness(), 8, { x: 0, z: 2 })).toBeDefined();
  });

  it("notices a person in view at medium range, but later than a close one", () => {
    const a = new Awareness();
    expect(run(a, 5, { x: 0, z: -6 })).toBeUndefined();
    expect(run(a, 8, { x: 0, z: -6 })).toBeDefined();
  });

  it("ignores someone behind at medium range for a short time", () => {
    expect(run(new Awareness(), 10, { x: 0, z: 6 })).toBeUndefined();
  });

  it("notices a tail that stays within range for a long time", () => {
    expect(run(new Awareness(), 20, { x: 0, z: 10 })).toBeUndefined();
    expect(run(new Awareness(), 40, { x: 0, z: 10 })).toBeDefined();
  });

  it("is faster when the observer sprints", () => {
    expect(run(new Awareness(), 4, { x: 0, z: -6 }, true)).toBeDefined();
  });

  it("calms down when the observer leaves", () => {
    const a = new Awareness();
    run(a, 4, { x: 0, z: 2 });
    const before = a.suspicion;
    run(a, 5, { x: 0, z: 100 });
    expect(a.suspicion).toBeLessThan(before);
  });
});
