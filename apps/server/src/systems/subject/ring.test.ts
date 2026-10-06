import { describe, expect, it } from "vitest";
import { RING_NODES, farthestNode, ringPath } from "./ring";

describe("ringPath", () => {
  it("takes the shorter way around the ring", () => {
    expect(ringPath(0, 2)).toEqual([1, 2]);
    expect(ringPath(0, 6)).toEqual([7, 6]);
    expect(ringPath(3, 3)).toEqual([]);
  });

  it("wraps around the ring", () => {
    expect(ringPath(7, 1)).toEqual([0, 1]);
  });
});

describe("farthestNode", () => {
  it("picks the node across the ring", () => {
    const n = farthestNode(RING_NODES[0] ?? { x: 0, z: 0 });
    expect(n).toBe(4);
  });
});
