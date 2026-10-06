import type { FaceLook } from "@vanta/shared";

/**
 * Faces shown on photo items. The client needs these to draw the photo; they say
 * nothing about where the person is or what they wear.
 */
export const PHOTO_FACES: Record<string, FaceLook> = {
  "photo:subject_case001": { skin: "skin_2", hair: "hair_brown", faceShape: "oval" },
};
