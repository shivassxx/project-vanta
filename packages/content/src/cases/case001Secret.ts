import type { NpcLook } from "@vanta/shared";
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
}

const subjectFace = PHOTO_FACES["photo:subject_case001"];
if (!subjectFace) throw new Error("missing subject face");

/** Elena Marsh Varga. Clothing differs from nothing in the photo: players must watch. */
export const CASE_001_SUBJECT: PersonDef = {
  key: "subject",
  look: { ...subjectFace, jacket: "jacket_green", build: "slim" },
  startNode: 0,
  walkSpeed: 1.5,
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
