import type { EvidenceSpotDef } from "@vanta/content/server";
import { INTERACT_RANGE, SpotState, type CharacterId, type FoundEvidence, type Vec2 } from "@vanta/shared";
import { NoCharacterData, type CharacterDataRepository } from "../persistence/CharacterDataRepository";

/**
 * Evidence each character holds. Server-only; a client only ever receives its own list.
 * Loaded from the character save on first use and written through on every change.
 */
export class EvidenceStore {
  private readonly byCharacter = new Map<CharacterId, Map<string, FoundEvidence>>();

  constructor(private readonly repo: CharacterDataRepository = new NoCharacterData()) {}

  private held(characterId: CharacterId): Map<string, FoundEvidence> {
    let held = this.byCharacter.get(characterId);
    if (!held) {
      held = new Map(this.repo.loadEvidence(characterId).map((e) => [e.item.id, e]));
      this.byCharacter.set(characterId, held);
    }
    return held;
  }

  grant(characterId: CharacterId, found: FoundEvidence): boolean {
    const held = this.held(characterId);
    if (held.has(found.item.id)) return false;
    held.set(found.item.id, found);
    this.repo.saveEvidence(characterId, [...held.values()]);
    return true;
  }

  has(characterId: CharacterId, evidenceId: string): FoundEvidence | undefined {
    return this.held(characterId).get(evidenceId);
  }

  list(characterId: CharacterId): FoundEvidence[] {
    return [...this.held(characterId).values()];
  }
}

export type ExamineResult =
  | { ok: true; def: EvidenceSpotDef; removed: boolean }
  | { ok: false; reason: "unknown" | "too far" };

/** Evidence physically placed in one room's world. */
export class EvidenceWorld {
  private readonly spots = new Map<string, EvidenceSpotDef>();

  constructor(defs: readonly EvidenceSpotDef[]) {
    for (const d of defs) this.spots.set(d.spotId, d);
  }

  populate(target: Map<string, SpotState>): void {
    for (const d of this.spots.values()) {
      const s = new SpotState();
      s.id = d.spotId;
      s.x = d.position.x;
      s.z = d.position.z;
      s.label = d.label;
      target.set(d.spotId, s);
    }
  }

  /** Interactive spots (e.g. a locked door) behave like conversation targets. */
  findInteractive(id: string): { pos: Vec2; conversation: string; observed: string } | undefined {
    const d = this.spots.get(id);
    return d?.interaction ? { pos: d.position, conversation: d.interaction, observed: d.label } : undefined;
  }

  /** Validates distance on the server; picking up removes the spot for everyone. */
  examine(spotId: unknown, from: Vec2): ExamineResult {
    const def = typeof spotId === "string" ? this.spots.get(spotId) : undefined;
    if (!def) return { ok: false, reason: "unknown" };
    if (Math.hypot(def.position.x - from.x, def.position.z - from.z) > INTERACT_RANGE + 0.5) return { ok: false, reason: "too far" };
    if (def.pickUp) this.spots.delete(def.spotId);
    return { ok: true, def, removed: def.pickUp };
  }
}
