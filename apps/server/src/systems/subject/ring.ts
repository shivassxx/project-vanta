import type { Vec2 } from "@vanta/shared";

/**
 * Walkable ring road around the greybox (clear of every wall and prop).
 * NPCs navigate between nodes along the ring; real navmesh (recast) arrives with the city.
 */
export const RING_NODES: readonly Vec2[] = [
  { x: -9, z: 9 },
  { x: 0, z: 9 },
  { x: 9, z: 9 },
  { x: 9, z: 0 },
  { x: 9, z: -9 },
  { x: 0, z: -9 },
  { x: -9, z: -9 },
  { x: -9, z: 0 },
];

const N = RING_NODES.length;

/** Shortest node path along the ring, excluding `from`, including `to`. */
export function ringPath(from: number, to: number): number[] {
  if (from === to) return [];
  const forward = (to - from + N) % N;
  const step = forward <= N - forward ? 1 : -1;
  const count = step === 1 ? forward : N - forward;
  const path: number[] = [];
  for (let i = 1; i <= count; i++) path.push((from + step * i + N * 2) % N);
  return path;
}

/** The node farthest from a point, used when someone wants to get away from it. */
export function farthestNode(from: Vec2): number {
  let best = 0;
  let bestD = -1;
  RING_NODES.forEach((n, i) => {
    const d = Math.hypot(n.x - from.x, n.z - from.z);
    if (d > bestD) {
      best = i;
      bestD = d;
    }
  });
  return best;
}
