import type { CharacterId, FoundEvidence, KnownInfo } from "@vanta/shared";

/** What a character carries between sessions besides their identity: what they know and hold. */
export interface CharacterDataRepository {
  loadKnowledge(id: CharacterId): KnownInfo[];
  saveKnowledge(id: CharacterId, list: KnownInfo[]): void;
  loadEvidence(id: CharacterId): FoundEvidence[];
  saveEvidence(id: CharacterId, list: FoundEvidence[]): void;
}

/** Default: nothing outlives the process. */
export class NoCharacterData implements CharacterDataRepository {
  loadKnowledge(): KnownInfo[] {
    return [];
  }
  saveKnowledge(): void {}
  loadEvidence(): FoundEvidence[] {
    return [];
  }
  saveEvidence(): void {}
}
