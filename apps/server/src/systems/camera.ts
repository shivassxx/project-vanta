import { areaName } from "@vanta/content";
import {
  BUILDS,
  JACKET_COLORS,
  PHOTO_DETAIL_RANGE,
  PHOTO_HALF_FOV,
  PHOTO_RANGE,
  describeLook,
  type Box2,
  type NpcLook,
  type Vec2,
} from "@vanta/shared";

export interface PhotoPerson {
  pos: Vec2;
  look: NpcLook;
  isSubject: boolean;
  /** Lying on the ground. */
  down?: boolean;
}

export interface PhotoVehicle {
  pos: Vec2;
  description: string;
  plate: string;
}

export interface PhotoScene {
  people: readonly PhotoPerson[];
  vehicles: readonly PhotoVehicle[];
  /** Tall occluders only (walls); low props do not block a phone camera. */
  occluders: readonly Box2[];
}

export interface PhotoResult {
  area: string;
  /** What the photo shows. Never names anyone. */
  lines: string[];
  /** Server-only: for the case engine, never sent to clients. */
  subjectInFrame: boolean;
}

/** Segment-vs-box test (slab method) on the ground plane. */
export function segmentHitsBox(a: Vec2, b: Vec2, box: Box2): boolean {
  let t0 = 0;
  let t1 = 1;
  const d = { x: b.x - a.x, z: b.z - a.z };
  for (const [p, dp, min, max] of [
    [a.x, d.x, box.minX, box.maxX],
    [a.z, d.z, box.minZ, box.maxZ],
  ] as const) {
    if (Math.abs(dp) < 1e-9) {
      if (p < min || p > max) return false;
      continue;
    }
    let ta = (min - p) / dp;
    let tb = (max - p) / dp;
    if (ta > tb) [ta, tb] = [tb, ta];
    t0 = Math.max(t0, ta);
    t1 = Math.min(t1, tb);
    if (t0 > t1) return false;
  }
  return true;
}

function inFrame(from: Vec2, yaw: number, target: Vec2, occluders: readonly Box2[]): number | undefined {
  const dx = target.x - from.x;
  const dz = target.z - from.z;
  const dist = Math.hypot(dx, dz);
  if (dist > PHOTO_RANGE || dist < 0.3) return undefined;
  const fx = -Math.sin(yaw);
  const fz = -Math.cos(yaw);
  if ((dx * fx + dz * fz) / dist < Math.cos(PHOTO_HALF_FOV)) return undefined;
  if (occluders.some((b) => segmentHitsBox(from, target, b))) return undefined;
  return dist;
}

const jacketName = (id: string) => JACKET_COLORS.find((j) => j.id === id)?.name ?? "dark";
const buildWord = (b: (typeof BUILDS)[number]) => (b === "average" ? "" : `${b} `);
const withArticle = (phrase: string) => `${/^[aeiou]/i.test(phrase) ? "an" : "a"} ${phrase}`;

/** Composes what a phone photo captures from the server's authoritative positions. */
export function composePhoto(from: Vec2, yaw: number, scene: PhotoScene): PhotoResult {
  const lines: string[] = [];
  let subjectInFrame = false;
  const people = scene.people
    .map((p) => ({ p, d: inFrame(from, yaw, p.pos, scene.occluders) }))
    .filter((x): x is { p: PhotoPerson; d: number } => x.d !== undefined)
    .sort((a, b) => a.d - b.d);
  for (const { p, d } of people) {
    if (p.isSubject) subjectInFrame = true;
    const ground = p.down ? " Lying motionless on the ground." : "";
    lines.push(
      (d <= PHOTO_DETAIL_RANGE
        ? `A person, close: ${describeLook(p.look)}.`
        : `A ${buildWord(p.look.build)}person in ${withArticle(jacketName(p.look.jacket))} jacket, too far to make out a face.`) + ground,
    );
  }
  for (const v of scene.vehicles) {
    const d = inFrame(from, yaw, v.pos, scene.occluders);
    if (d === undefined) continue;
    lines.push(d <= PHOTO_DETAIL_RANGE ? `A ${v.description}, plate ${v.plate}.` : `A ${v.description}, plate unreadable.`);
  }
  if (lines.length === 0) lines.push("Nothing of note: street, walls, sky.");
  return { area: areaName(from), lines, subjectInFrame };
}
