import type { Vec2 } from "@vanta/shared";
import type { Stop } from "@vanta/content/server";
import { RING_NODES, farthestNode, ringPath } from "./ring";

export type BrainMode = "routine" | "evading";

export interface BrainEvent {
  type: "arrived" | "departed" | "evade";
  node: number;
  note?: string;
}

const HURRIED_FACTOR = 1.9;
const EVADE_DWELL_SEC = 25;

/**
 * Schedule-driven mover: dwell at a stop, walk the ring to the next, repeat.
 * `evade()` replaces the next leg with a retreat to the farthest node, then resumes the plan
 * at the following stop: the route visibly changes.
 */
export class Brain {
  pos: Vec2;
  facing = 0;
  mode: BrainMode = "routine";
  private nodeIdx: number;
  /** Index of the next stop to walk to (the plan starts at stop 0). */
  private stopIdx: number;
  private path: number[] = [];
  private dwellLeft: number;
  private currentNote = "";

  constructor(
    startNode: number,
    private readonly plan: readonly Stop[],
    private readonly walkSpeed: number,
    /** Fixed position for people who stay put (their plan never ends the first dwell). */
    standAt?: Vec2,
  ) {
    this.nodeIdx = startNode;
    this.stopIdx = 1 % plan.length;
    const start = RING_NODES[startNode];
    if (!start || plan.length === 0) throw new Error("invalid brain definition");
    this.pos = { ...(standAt ?? start) };
    this.dwellLeft = plan[0]?.dwellSec ?? 0;
  }

  get moving(): boolean {
    return this.path.length > 0;
  }

  /** Index of the node the person is walking toward, or standing at. */
  get targetNode(): number {
    return this.path[this.path.length - 1] ?? this.nodeIdx;
  }

  tick(dt: number, emit: (e: BrainEvent) => void = () => undefined): void {
    if (this.path.length === 0) {
      this.dwellLeft -= dt;
      if (this.dwellLeft > 0) return;
      this.beginNextLeg(emit);
      return;
    }
    const next = RING_NODES[this.path[0] ?? -1];
    if (!next) return;
    const speed = this.walkSpeed * (this.mode === "evading" ? HURRIED_FACTOR : 1);
    const dx = next.x - this.pos.x;
    const dz = next.z - this.pos.z;
    const dist = Math.hypot(dx, dz);
    const stepLen = speed * dt;
    this.facing = Math.atan2(-dx, -dz);
    if (dist <= stepLen) {
      this.pos = { ...next };
      this.nodeIdx = this.path.shift() ?? this.nodeIdx;
      if (this.path.length === 0) {
        emit({ type: "arrived", node: this.nodeIdx, note: this.currentNote });
        if (this.mode === "evading") {
          this.dwellLeft = EVADE_DWELL_SEC;
          this.mode = "routine";
        }
      }
      return;
    }
    this.pos = { x: this.pos.x + (dx / dist) * stepLen, z: this.pos.z + (dz / dist) * stepLen };
  }

  /** Turns to face a point (e.g. to glance at a suspected tail). */
  faceToward(p: Vec2): void {
    this.facing = Math.atan2(-(p.x - this.pos.x), -(p.z - this.pos.z));
  }

  /** Abandons the current leg and retreats away from `from`, then rejoins the plan. */
  evade(from: Vec2, emit: (e: BrainEvent) => void = () => undefined): void {
    const target = farthestNode(from);
    this.mode = "evading";
    this.currentNote = "evading";
    this.path = ringPath(this.nodeIdx, target);
    // Leaving mid-ring: continue from the nearest node in the direction already walking.
    if (this.path.length === 0) {
      this.mode = "routine";
      this.dwellLeft = EVADE_DWELL_SEC;
    }
    this.advanceStopAfterEvade();
    emit({ type: "evade", node: target });
  }

  private advanceStopAfterEvade(): void {
    this.stopIdx = (this.stopIdx + 1) % this.plan.length;
  }

  private beginNextLeg(emit: (e: BrainEvent) => void): void {
    const stop = this.plan[this.stopIdx];
    if (!stop) return;
    this.currentNote = stop.note;
    this.path = ringPath(this.nodeIdx, stop.node);
    this.stopIdx = (this.stopIdx + 1) % this.plan.length;
    const after = this.plan[(this.stopIdx + this.plan.length - 1) % this.plan.length];
    this.dwellLeft = after?.dwellSec ?? 0;
    if (this.path.length > 0) emit({ type: "departed", node: stop.node, note: stop.note });
  }
}
