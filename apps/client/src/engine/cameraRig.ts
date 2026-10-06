export type CameraMode = "explore" | "shoulder" | "investigate";

export interface CameraPreset {
  distance: number;
  height: number;
  shoulder: number; // lateral offset, + = right
  fov: number;
}

export const CAMERA_PRESETS: Record<CameraMode, CameraPreset> = {
  explore: { distance: 5.5, height: 2.4, shoulder: 0, fov: 65 },
  shoulder: { distance: 2.8, height: 1.7, shoulder: 0.7, fov: 55 },
  investigate: { distance: 1.8, height: 1.5, shoulder: 0.4, fov: 40 },
};

export function resolveMode(aim: boolean, investigate: boolean): CameraMode {
  return investigate ? "investigate" : aim ? "shoulder" : "explore";
}

export const PITCH_MIN = -0.35;
export const PITCH_MAX = 1.1;

export function clampPitch(p: number): number {
  return Math.min(PITCH_MAX, Math.max(PITCH_MIN, p));
}

export function lerpPreset(a: CameraPreset, b: CameraPreset, t: number): CameraPreset {
  const l = (x: number, y: number) => x + (y - x) * t;
  return { distance: l(a.distance, b.distance), height: l(a.height, b.height), shoulder: l(a.shoulder, b.shoulder), fov: l(a.fov, b.fov) };
}
