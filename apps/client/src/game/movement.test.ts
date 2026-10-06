import { describe, expect, it } from "vitest";
import { moveWithCollision, worldDirection } from "./movement";

const wall = { minX: -5, maxX: 5, minZ: -0.25, maxZ: 0.25 };

describe("moveWithCollision", () => {
  it("moves freely in open space", () => {
    const p = moveWithCollision({ x: 0, z: 5 }, { x: 1, z: 0 }, [wall]);
    expect(p.x).toBeCloseTo(1);
    expect(p.z).toBeCloseTo(5);
  });

  it("is blocked by a wall but slides along it", () => {
    const p = moveWithCollision({ x: 0, z: 1 }, { x: 1, z: -1 }, [wall]);
    expect(p.z).toBeGreaterThanOrEqual(0.25 + 0.4 - 1e-6);
    expect(p.x).toBeCloseTo(1);
  });

  it("pushes a center-inside position out", () => {
    const p = moveWithCollision({ x: 0, z: 0.1 }, { x: 0, z: 0 }, [wall]);
    expect(Math.abs(p.z)).toBeGreaterThanOrEqual(0.65 - 1e-6);
  });
});

describe("worldDirection", () => {
  it("forward at yaw 0 is -Z, right is +X", () => {
    const f = worldDirection({ x: 0, y: 1 }, 0);
    expect(f.x).toBeCloseTo(0);
    expect(f.z).toBeCloseTo(-1);
    const r = worldDirection({ x: 1, y: 0 }, 0);
    expect(r.x).toBeCloseTo(1);
    expect(r.z).toBeCloseTo(0);
  });

  it("normalizes diagonals", () => {
    const d = worldDirection({ x: 1, y: 1 }, 0);
    expect(Math.hypot(d.x, d.z)).toBeCloseTo(1);
  });
});
