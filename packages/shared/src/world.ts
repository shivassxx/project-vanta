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

export const SPAWN_POINTS: readonly Vec2[] = [
  { x: 0, z: 8 },
  { x: 2, z: 8 },
  { x: -2, z: 8 },
  { x: 4, z: 8 },
  { x: -4, z: 8 },
  { x: 6, z: 8 },
];
