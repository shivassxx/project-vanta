import { describe, expect, it } from "vitest";
import { findInteractable, type Interactable } from "./interaction";

const at = (id: string, x: number, z: number): Interactable => ({ id, kind: "inspect", label: id, position: { x, z }, range: 2 });

describe("findInteractable", () => {
  it("picks the nearest item in range in front of the player", () => {
    const items = [at("far", 0, -1.8), at("near", 0, -1)];
    expect(findInteractable({ x: 0, z: 0 }, 0, items)?.id).toBe("near");
  });

  it("ignores items behind the player or out of range", () => {
    expect(findInteractable({ x: 0, z: 0 }, 0, [at("behind", 0, 1)])).toBeUndefined();
    expect(findInteractable({ x: 0, z: 0 }, 0, [at("away", 0, -5)])).toBeUndefined();
  });
});
