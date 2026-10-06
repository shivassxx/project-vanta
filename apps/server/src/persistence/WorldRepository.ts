import type { CaseState } from "@vanta/case-engine";
import type { CampaignId, CharacterId, PhoneMessage } from "@vanta/shared";

export const WORLD_STATE_VERSION = 1;

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
}

export function emptyWorld(campaignId: CampaignId): WorldState {
  return { version: WORLD_STATE_VERSION, campaignId, cases: {}, vantaDelivered: {}, people: {}, policeAttention: {}, phone: {} };
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
    const state = JSON.parse(raw) as WorldState;
    if (state.version !== WORLD_STATE_VERSION) throw new Error(`world state version ${state.version} needs a migration`);
    return state;
  }

  save(state: WorldState): void {
    this.byCampaign.set(state.campaignId, JSON.stringify(state));
  }
}
