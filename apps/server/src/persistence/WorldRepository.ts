import type { CaseState } from "@vanta/case-engine";
import type { Board, CampaignId, CharacterId, PhoneMessage } from "@vanta/shared";
import { runMigrations, type Migration } from "./migrations";

export const WORLD_STATE_VERSION = 2;

/** v1 -> v2: case boards and used abilities became campaign memory. */
export const WORLD_MIGRATIONS: readonly Migration[] = [{ from: 1, migrate: (d) => ({ ...d, boards: {}, usedAbilities: {} }) }];

export function migrateWorld(raw: unknown): WorldState {
  return runMigrations<WorldState>(raw, WORLD_STATE_VERSION, WORLD_MIGRATIONS, "world save");
}

export type PersonStatus = "present" | "gone" | "dead";

/**
 * Campaign-wide facts that outlive any room. Stable string IDs only; plain JSON so it can be
 * saved as-is (durable storage arrives in M9).
 */
export interface WorldState {
  version: number;
  campaignId: CampaignId;
  /** Runtime state per case ID. */
  cases: Record<string, CaseState>;
  /** Items VANTA has delivered to the IGL role, per case ID. */
  vantaDelivered: Record<string, string[]>;
  /** People by content key whose status differs from "present". */
  people: Record<string, PersonStatus>;
  /** Reasons the police are interested in a character. */
  policeAttention: Record<CharacterId, string[]>;
  phone: Record<CharacterId, PhoneMessage[]>;
  /** Shared case board per case ID. */
  boards: Record<string, Board>;
  /** Abilities each character has used (one use per campaign). */
  usedAbilities: Record<CharacterId, string[]>;
}

export function emptyWorld(campaignId: CampaignId): WorldState {
  return {
    version: WORLD_STATE_VERSION,
    campaignId,
    cases: {},
    vantaDelivered: {},
    people: {},
    policeAttention: {},
    phone: {},
    boards: {},
    usedAbilities: {},
  };
}

export interface WorldRepository {
  load(campaignId: CampaignId): WorldState;
  save(state: WorldState): void;
}

/** Keeps a JSON copy so callers can never mutate stored state by accident. */
export class InMemoryWorldRepository implements WorldRepository {
  private readonly byCampaign = new Map<CampaignId, string>();

  load(campaignId: CampaignId): WorldState {
    const raw = this.byCampaign.get(campaignId);
    if (!raw) return emptyWorld(campaignId);
    return migrateWorld(JSON.parse(raw));
  }

  save(state: WorldState): void {
    this.byCampaign.set(state.campaignId, JSON.stringify(state));
  }
}
