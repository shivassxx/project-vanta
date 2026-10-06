/** Stable string IDs only; never object references (see save rules). */
export type CharacterId = string;
export type CampaignId = string;
export type ProfessionId = string;

/** Join options. `playerToken` is a client-held secret; never broadcast or logged. */
export interface JoinOptions {
  playerToken?: string;
}

/** Sent only to the owning client. Never placed in shared schema state. */
export interface PrivateProfile {
  characterId: CharacterId;
  campaignId: CampaignId;
  professionId: ProfessionId;
}

export const MSG_PRIVATE_PROFILE = "privateProfile";
/** Client asks for its own profile once its handler is registered (also after reconnect). */
export const MSG_REQUEST_PROFILE = "requestProfile";

export const PLAYER_TOKEN_PATTERN = /^[A-Za-z0-9_-]{16,64}$/;
