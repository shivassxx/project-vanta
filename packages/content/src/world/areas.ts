import type { Vec2 } from "@vanta/shared";

/** Named places in the greybox, used to caption photos and records. Public. */
export interface AreaDef {
  name: string;
  center: Vec2;
}

export const GREYBOX_AREAS: readonly AreaDef[] = [
  { name: "outside the café", center: { x: 9, z: 9 } },
  { name: "by the park bench", center: { x: 9, z: -9 } },
  { name: "at the office lot", center: { x: -9, z: -9 } },
  { name: "near the apartments", center: { x: -9, z: 9 } },
  { name: "on Harlow Street", center: { x: 0, z: 9 } },
  { name: "in the middle of the block", center: { x: 0, z: 0 } },
];

export function areaName(p: Vec2): string {
  let best = GREYBOX_AREAS[0];
  let bestD = Infinity;
  for (const a of GREYBOX_AREAS) {
    const d = Math.hypot(a.center.x - p.x, a.center.z - p.z);
    if (d < bestD) {
      best = a;
      bestD = d;
    }
  }
  return best?.name ?? "somewhere";
}
