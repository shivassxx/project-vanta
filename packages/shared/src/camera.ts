/** Client -> server: take a phone photo facing `yaw` (radians, same convention as the camera). */
export interface PhotoRequest {
  yaw: number;
}

export const MSG_TAKE_PHOTO = "takePhoto";
/** Horizontal half-angle of the phone camera. */
export const PHOTO_HALF_FOV = (25 * Math.PI) / 180;
export const PHOTO_RANGE = 22;
/** Faces and plates are only readable this close. */
export const PHOTO_DETAIL_RANGE = 8;
export const PHOTO_COOLDOWN_MS = 1500;
export const PHOTO_MAX_PER_CHARACTER = 40;
