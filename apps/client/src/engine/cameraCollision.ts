import { segmentBoxEntry, type Box2, type Vec2 } from "@vanta/shared";

export interface Occluder extends Box2 {
  height: number;
}

/**
 * Pulls the camera in front of anything between the player's head and the camera, so walls never
 * hide the player. Returns the fraction (0..1) of the desired distance that is clear.
 */
export function clearCameraFraction(head: Vec2, headY: number, cam: Vec2, camY: number, occluders: readonly Occluder[]): number {
  let clear = 1;
  for (const o of occluders) {
    const t = segmentBoxEntry(head, cam, o);
    if (t === undefined) continue;
    // Height of the sight line where it enters the box: above the top means it passes over.
    if (headY + (camY - headY) * t > o.height) continue;
    clear = Math.min(clear, t);
  }
  return clear >= 1 ? 1 : Math.max(0.12, clear - 0.06);
}
