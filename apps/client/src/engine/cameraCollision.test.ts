import { describe, expect, it } from "vitest";
import { clearCameraFraction } from "./cameraCollision";

const wall = { minX: -5, maxX: 5, minZ: 4, maxZ: 4.5, height: 3 };

describe("clearCameraFraction", () => {
  it("keeps the full distance when nothing is in the way", () => {
    expect(clearCameraFraction({ x: 0, z: 0 }, 1.4, { x: 0, z: -5 }, 2.5, [wall])).toBe(1);
  });

  it("pulls the camera in front of a wall behind the player", () => {
    const f = clearCameraFraction({ x: 0, z: 0 }, 1.4, { x: 0, z: 6 }, 2.5, [wall]);
    expect(f).toBeGreaterThan(0.5);
    expect(f).toBeLessThan(4 / 6);
  });

  it("ignores walls the sight line passes over", () => {
    expect(clearCameraFraction({ x: 0, z: 0 }, 1.4, { x: 0, z: 6 }, 9, [wall])).toBe(1);
  });
});
