import type { CampaignId, CharacterId, ProfessionId } from "@vanta/shared";

export interface CharacterRecord {
  id: CharacterId;
  campaignId: CampaignId;
  professionId: ProfessionId;
  createdAt: number;
}

/** Storage boundary. In-memory now; SQLite implementation arrives with M9 saves. */
export interface CharacterRepository {
  findByToken(token: string): CharacterRecord | undefined;
  insert(token: string, record: CharacterRecord): void;
  listByCampaign(campaignId: CampaignId): CharacterRecord[];
}

export class InMemoryCharacterRepository implements CharacterRepository {
  private readonly byToken = new Map<string, CharacterRecord>();

  findByToken(token: string): CharacterRecord | undefined {
    return this.byToken.get(token);
  }

  insert(token: string, record: CharacterRecord): void {
    if (this.byToken.has(token)) throw new Error("token already registered");
    this.byToken.set(token, record);
  }

  listByCampaign(campaignId: CampaignId): CharacterRecord[] {
    return [...this.byToken.values()].filter((r) => r.campaignId === campaignId);
  }
}
