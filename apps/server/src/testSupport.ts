import type { Vec2 } from "@vanta/shared";

/** Spawn points the integration tests were written against (fixtures are placed relative to them). */
export const TEST_SPAWNS: readonly Vec2[] = [
  { x: 0, z: 8 },
  { x: 2, z: 8 },
  { x: -2, z: 8 },
  { x: 4, z: 8 },
  { x: -4, z: 8 },
  { x: 6, z: 8 },
];
