import type { CharacterId } from "./characters";

export type SubjectInfoKind = "fullName" | "citizenId" | "photo" | "approxLocation";

/** One shareable piece of Subject information. */
export interface SubjectInfoItem {
  id: string;
  kind: SubjectInfoKind;
  label: string;
  value: string;
}

/** Something a character knows, and how they came to know it. */
export interface KnownInfo {
  item: SubjectInfoItem;
  source: "vanta" | "teammate";
  fromCharacterId?: CharacterId;
  receivedAt: number;
}

/** IGL -> server: share one item with chosen teammates. */
export interface ShareRequest {
  itemId: string;
  toCharacterIds: CharacterId[];
}

/** Server -> one client: the full list of what that character knows. */
export const MSG_KNOWLEDGE = "knowledge";
export const MSG_SHARE_ITEM = "shareItem";
