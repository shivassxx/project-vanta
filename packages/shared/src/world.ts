import type { Box2, Vec2 } from "./movement";

/** Static greybox layout shared by client (rendering) and server (collision). */
export interface WallDef extends Box2 {
  height: number;
  kind: "wall" | "prop";
}

function box(cx: number, cz: number, w: number, d: number, height: number, kind: WallDef["kind"]): WallDef {
  return { minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2, height, kind };
}

export const GREYBOX_WALLS: readonly WallDef[] = [
  box(0, -12, 24, 0.5, 3, "wall"),
  box(0, 12, 24, 0.5, 3, "wall"),
  box(-12, 0, 0.5, 24, 3, "wall"),
  box(12, 0, 0.5, 24, 3, "wall"),
  box(-4, -3, 6, 0.5, 3, "wall"),
  box(5, -5, 1.5, 1.5, 1.5, "prop"),
  box(-6, 6, 2, 1, 1, "prop"),
];

/**
 * Where players appear: the middle of the block, away from the ring road the Subject walks,
 * so nobody starts out standing in her path.
 */
/** Footprint of a parked car (1.8 m wide, 4.2 m long) for collision. */
export function vehicleBox(x: number, z: number, heading: number): Box2 {
  const sideways = Math.abs(Math.sin(heading)) > 0.5;
  const halfW = sideways ? 2.1 : 0.9;
  const halfL = sideways ? 0.9 : 2.1;
  return { minX: x - halfW, maxX: x + halfW, minZ: z - halfL, maxZ: z + halfL };
}

export const SPAWN_POINTS: readonly Vec2[] = [
  { x: 0, z: 3 },
  { x: 2, z: 3 },
  { x: -2, z: 1.5 },
  { x: 4, z: 3 },
  { x: 0, z: 1 },
  { x: 2, z: 1 },
];
