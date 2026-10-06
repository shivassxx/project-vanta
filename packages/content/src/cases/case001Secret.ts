import type { NpcLook, Vec2 } from "@vanta/shared";
import { PHOTO_FACES } from "./case001Faces";

/**
 * SERVER-ONLY. Never import from client code: it reveals which person is the Subject and
 * what they will do. Exposed through "@vanta/content/server".
 */
export interface Stop {
  /** Ring node index (see server ring navigation). */
  node: number;
  dwellSec: number;
  note: string;
}

export interface PersonDef {
  /** Content key; the world assigns an opaque runtime ID. */
  key: string;
  look: NpcLook;
  startNode: number;
  plan: readonly Stop[];
  walkSpeed: number;
  /** Conversation ID (see conversations); people without one use the generic civilian. */
  conversation?: string;
  /** Stands still at this exact spot instead of walking the ring. */
  standAt?: Vec2;
}

const subjectFace = PHOTO_FACES["photo:subject_case001"];
if (!subjectFace) throw new Error("missing subject face");

/** Elena Marsh Varga. Clothing differs from nothing in the photo: players must watch. */
export const CASE_001_SUBJECT: PersonDef = {
  key: "subject",
  look: { ...subjectFace, jacket: "jacket_green", build: "slim" },
  startNode: 0,
  walkSpeed: 1.5,
  conversation: "subject",
  plan: [
    { node: 0, dwellSec: 25, note: "leaves home" },
    { node: 2, dwellSec: 40, note: "coffee shop" },
    { node: 4, dwellSec: 35, note: "park bench, meets someone" },
    { node: 6, dwellSec: 40, note: "office" },
  ],
};

/** Civilians. Some share traits with the Subject so a glance is not enough. */
export const CASE_001_CIVILIANS: readonly PersonDef[] = [
  {
    key: "civilian_a",
    look: { skin: "skin_2", hair: "hair_brown", faceShape: "round", jacket: "jacket_navy", build: "average" },
    startNode: 1,
    walkSpeed: 1.3,
    plan: [
      { node: 1, dwellSec: 20, note: "waits" },
      { node: 3, dwellSec: 30, note: "errand" },
    ],
  },
  {
    key: "civilian_b",
    look: { skin: "skin_3", hair: "hair_black", faceShape: "angular", jacket: "jacket_green", build: "average" },
    startNode: 3,
    walkSpeed: 1.4,
    plan: [
      { node: 3, dwellSec: 15, note: "smoking" },
      { node: 5, dwellSec: 25, note: "walks" },
      { node: 7, dwellSec: 20, note: "walks" },
    ],
  },
  {
    key: "civilian_c",
    look: { skin: "skin_1", hair: "hair_blond", faceShape: "oval", jacket: "jacket_red", build: "heavy" },
    startNode: 5,
    walkSpeed: 1.2,
    plan: [
      { node: 5, dwellSec: 30, note: "bench" },
      { node: 1, dwellSec: 30, note: "bench" },
    ],
  },
];

/** Important NPCs who stay at their workplace. One tells the truth, one does not. */
export const CASE_001_WITNESSES: readonly PersonDef[] = [
  {
    key: "witness_barista",
    look: { skin: "skin_4", hair: "hair_black", faceShape: "round", jacket: "jacket_tan", build: "average" },
    startNode: 2,
    walkSpeed: 0,
    conversation: "barista",
    standAt: { x: 10.5, z: 7.2 },
    plan: [{ node: 2, dwellSec: Number.POSITIVE_INFINITY, note: "working" }],
  },
  {
    key: "witness_smoker",
    look: { skin: "skin_1", hair: "hair_grey", faceShape: "angular", jacket: "jacket_black", build: "heavy" },
    startNode: 4,
    walkSpeed: 0,
    conversation: "smoker",
    standAt: { x: 7.4, z: -10.6 },
    plan: [{ node: 4, dwellSec: Number.POSITIVE_INFINITY, note: "smoking" }],
  },
];
