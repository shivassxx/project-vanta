import type { CharacterId } from "@vanta/shared";
import type { Rng } from "./characters";

/** Probability that VANTA restores a returning IGL instead of keeping the replacement. */
export const RESTORE_ON_RETURN_CHANCE = 0.5;

function pick(candidates: readonly CharacterId[], rng: Rng): CharacterId | undefined {
  if (candidates.length === 0) return undefined;
  return candidates[Math.min(candidates.length - 1, Math.floor(rng() * candidates.length))];
}

/**
 * VANTA's IGL designation. Pure state machine; criteria are deliberately opaque (random
 * for now) and never sent to clients. Every method returns true if the IGL changed.
 */
export class IglSystem {
  igl: CharacterId | undefined;
  /** The original IGL while a temporary replacement is in charge. */
  designated: CharacterId | undefined;

  constructor(
    private readonly rng: Rng,
    private readonly minPlayers: number,
  ) {}

  /** Designates an IGL once enough characters are connected. */
  ensure(connected: readonly CharacterId[]): boolean {
    if (this.igl !== undefined || connected.length < this.minPlayers) return false;
    this.igl = pick(connected, this.rng);
    return this.igl !== undefined;
  }

  /** IGL lost connection: VANTA picks a temporary IGL among the others. */
  onDisconnect(id: CharacterId, connected: readonly CharacterId[]): boolean {
    if (id !== this.igl) return false;
    this.designated ??= id;
    this.igl = pick(
      connected.filter((c) => c !== id),
      this.rng,
    );
    return true;
  }

  /** A character came back. If they were the designated IGL, VANTA re-evaluates. */
  onReturn(id: CharacterId, connected: readonly CharacterId[]): boolean {
    if (id !== this.designated) return this.ensure(connected);
    this.designated = undefined;
    if (this.igl === undefined || this.rng() < RESTORE_ON_RETURN_CHANCE) {
      const changed = this.igl !== id;
      this.igl = id;
      return changed;
    }
    return false;
  }

  /** Character is gone for good (left, or reconnect window expired). */
  onRemoved(id: CharacterId, connected: readonly CharacterId[]): boolean {
    if (this.designated === id) this.designated = undefined;
    if (this.igl !== id) return false;
    this.igl = pick(
      connected.filter((c) => c !== id),
      this.rng,
    );
    return true;
  }
}
