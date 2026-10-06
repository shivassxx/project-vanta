import type { Vec2 } from "@vanta/shared";

export interface Observer {
  pos: Vec2;
  sprinting: boolean;
  /** Walking or running right now. */
  moving: boolean;
}

export interface AwarenessConfig {
  /** Field of view (full angle, radians) in which being seen counts. */
  fov: number;
  /** Seen within this range: suspicion rises. */
  seenRange: number;
  /** Anyone this close is noticed regardless of facing. */
  closeRange: number;
  /** A person staying within this range for long is a tail. */
  tailRange: number;
  seenRate: number;
  closeRate: number;
  tailRate: number;
  sprintBonus: number;
  decay: number;
  threshold: number;
}

export const DEFAULT_AWARENESS: AwarenessConfig = {
  fov: (2 * Math.PI) / 3,
  seenRange: 6,
  closeRange: 3.5,
  tailRange: 12,
  seenRate: 1,
  closeRate: 2,
  tailRate: 0.35,
  sprintBonus: 1.5,
  decay: 0.6,
  threshold: 10,
};

/**
 * Hidden suspicion of one person. Server-only state: never put it into a schema or message.
 * "Obvious surveillance" = being watched up close while lingering, or a tail that keeps moving
 * with the Subject. Walking past someone who just stands there is ordinary street life.
 */
export class Awareness {
  suspicion = 0;

  constructor(private readonly cfg: AwarenessConfig = DEFAULT_AWARENESS) {}

  /** Advances by dt seconds; returns the nearest observer that pushed suspicion over the threshold. */
  update(dt: number, self: Vec2, facing: number, observers: readonly Observer[], selfMoving = false): Observer | undefined {
    const c = this.cfg;
    const fx = -Math.sin(facing);
    const fz = -Math.cos(facing);
    let rate = 0;
    let culprit: Observer | undefined;
    let culpritD = Infinity;
    for (const o of observers) {
      // The Subject walking past a person standing still is not surveillance.
      if (selfMoving && !o.moving) continue;
      const dx = o.pos.x - self.x;
      const dz = o.pos.z - self.z;
      const d = Math.hypot(dx, dz);
      let r = 0;
      if (d <= c.closeRange) r = c.closeRate;
      else if (d <= c.seenRange && d > 1e-6 && (dx * fx + dz * fz) / d >= Math.cos(c.fov / 2)) r = c.seenRate;
      else if (d <= c.tailRange && selfMoving) r = c.tailRate;
      if (r > 0 && o.sprinting) r += c.sprintBonus;
      if (r > 0 && d < culpritD) {
        culprit = o;
        culpritD = d;
      }
      rate += r;
    }
    this.suspicion = rate > 0 ? this.suspicion + rate * dt : Math.max(0, this.suspicion - c.decay * dt);
    return this.suspicion >= c.threshold ? culprit : undefined;
  }

  reset(): void {
    this.suspicion = 0;
  }
}
