import type { CharacterId } from "./characters";

export type EvidenceKind = "document" | "object" | "record" | "photo";

/**
 * What a piece of evidence says. Never carries authenticity or truth: evidence may be
 * incomplete, misleading or planted, and players decide what it means.
 */
export interface EvidenceItem {
  id: string;
  kind: EvidenceKind;
  title: string;
  description: string;
}

export interface FoundEvidence {
  item: EvidenceItem;
  foundBy: CharacterId;
  foundAt: number;
}

/** Shared case board (team-wide). Players draw their own links; the game never judges them. */
export type BoardEntryKind = "evidence" | "info" | "note";

export interface BoardEntry {
  id: string;
  kind: BoardEntryKind;
  /** Evidence or info item ID for pinned entries. */
  refId?: string;
  title: string;
  text: string;
  addedBy: CharacterId;
}

export interface BoardLink {
  id: string;
  from: string;
  to: string;
  label: string;
  addedBy: CharacterId;
}

export interface Board {
  entries: BoardEntry[];
  links: BoardLink[];
}

export type BoardCommand =
  | { type: "pinEvidence"; evidenceId: string }
  | { type: "pinInfo"; itemId: string }
  | { type: "addNote"; title: string; text: string }
  | { type: "link"; from: string; to: string; label: string }
  | { type: "removeLink"; linkId: string }
  | { type: "removeEntry"; entryId: string };

/** Client -> server: interact with a world target (validated by distance on the server). */
export interface InteractRequest {
  targetId: string;
}

export const MSG_INTERACT = "interact";
export const MSG_EVIDENCE = "evidence";
export const MSG_BOARD = "board";
export const MSG_BOARD_COMMAND = "boardCommand";

export const BOARD_TEXT_MAX = 280;
export const BOARD_TITLE_MAX = 60;
export const INTERACT_RANGE = 2.5;
