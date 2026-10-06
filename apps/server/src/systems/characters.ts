import { randomBytes } from "node:crypto";
import { PROFESSIONS } from "@vanta/content";
import type { CampaignId, PrivateProfile, ProfessionId } from "@vanta/shared";
import type { CharacterRecord, CharacterRepository } from "../persistence/CharacterRepository";

export type Rng = () => number;

/** Random profession at character creation; persistent afterwards. */
export function pickProfession(rng: Rng): ProfessionId {
  const i = Math.min(PROFESSIONS.length - 1, Math.floor(rng() * PROFESSIONS.length));
  const def = PROFESSIONS[i];
  if (!def) throw new Error("no professions defined");
  return def.id;
}

export function newCharacterId(): string {
  return `char_${randomBytes(6).toString("hex")}`;
}

export class CharacterService {
  constructor(
    private readonly repo: CharacterRepository,
    private readonly campaignId: CampaignId,
    private readonly rng: Rng = Math.random,
  ) {}

  /** Returns the token's existing character, or registers a new one in this campaign. */
  getOrCreate(token: string): CharacterRecord {
    const existing = this.repo.findByToken(token);
    if (existing) return existing;
    const record: CharacterRecord = {
      id: newCharacterId(),
      campaignId: this.campaignId,
      professionId: pickProfession(this.rng),
      createdAt: Date.now(),
    };
    this.repo.insert(token, record);
    console.log(`[Saves] registered character ${record.id} in ${record.campaignId}`);
    return record;
  }

  static toPrivateProfile(r: CharacterRecord): PrivateProfile {
    return { characterId: r.id, campaignId: r.campaignId, professionId: r.professionId };
  }
}
