import {
  BOARD_TEXT_MAX,
  BOARD_TITLE_MAX,
  type Board,
  type BoardCommand,
  type BoardEntry,
  type CharacterId,
  type EvidenceItem,
  type SubjectInfoItem,
} from "@vanta/shared";

/** What the acting character is allowed to pin (looked up by the host from server stores). */
export interface BoardContext {
  actor: CharacterId;
  evidenceOf: (id: string) => EvidenceItem | undefined;
  infoOf: (id: string) => SubjectInfoItem | undefined;
  newId: () => string;
}

export type BoardResult = { ok: true; board: Board; event?: { type: string; refId?: string } } | { ok: false; reason: string };

const MAX_ENTRIES = 200;
const MAX_LINKS = 400;
const clean = (v: unknown, max: number): string | undefined =>
  typeof v === "string" && v.trim().length > 0 ? v.trim().slice(0, max) : undefined;

export const emptyBoard = (): Board => ({ entries: [], links: [] });

/**
 * Pure reducer for the team's case board. Validates untrusted commands: players can pin only
 * what they hold, link only existing entries, and remove only what they added.
 */
export function applyBoardCommand(board: Board, raw: unknown, ctx: BoardContext): BoardResult {
  const cmd = raw as Partial<BoardCommand> | null;
  if (!cmd || typeof cmd.type !== "string") return { ok: false, reason: "malformed" };
  const entries = [...board.entries];
  const links = [...board.links];
  const add = (e: Omit<BoardEntry, "id" | "addedBy">): BoardResult => {
    if (entries.length >= MAX_ENTRIES) return { ok: false, reason: "board full" };
    if (e.refId && entries.some((x) => x.refId === e.refId)) return { ok: false, reason: "already pinned" };
    entries.push({ ...e, id: ctx.newId(), addedBy: ctx.actor });
    return { ok: true, board: { entries, links }, event: { type: e.kind === "note" ? "board.note" : "board.pinned", refId: e.refId } };
  };

  switch (cmd.type) {
    case "pinEvidence": {
      const ev = typeof cmd.evidenceId === "string" ? ctx.evidenceOf(cmd.evidenceId) : undefined;
      if (!ev) return { ok: false, reason: "evidence not held" };
      return add({ kind: "evidence", refId: ev.id, title: ev.title, text: ev.description });
    }
    case "pinInfo": {
      const info = typeof cmd.itemId === "string" ? ctx.infoOf(cmd.itemId) : undefined;
      if (!info) return { ok: false, reason: "info not known" };
      return add({ kind: "info", refId: info.id, title: info.label, text: info.kind === "photo" ? "[photo]" : info.value });
    }
    case "addNote": {
      const title = clean(cmd.title, BOARD_TITLE_MAX);
      const text = clean(cmd.text, BOARD_TEXT_MAX) ?? "";
      if (!title) return { ok: false, reason: "empty note" };
      return add({ kind: "note", title, text });
    }
    case "link": {
      const label = clean(cmd.label, BOARD_TITLE_MAX) ?? "";
      if (typeof cmd.from !== "string" || typeof cmd.to !== "string" || cmd.from === cmd.to) return { ok: false, reason: "bad link" };
      if (!entries.some((e) => e.id === cmd.from) || !entries.some((e) => e.id === cmd.to)) return { ok: false, reason: "unknown entry" };
      if (links.length >= MAX_LINKS) return { ok: false, reason: "too many links" };
      links.push({ id: ctx.newId(), from: cmd.from, to: cmd.to, label, addedBy: ctx.actor });
      return { ok: true, board: { entries, links }, event: { type: "board.linked" } };
    }
    case "removeLink": {
      const i = links.findIndex((l) => l.id === cmd.linkId);
      if (i < 0 || links[i]?.addedBy !== ctx.actor) return { ok: false, reason: "not yours" };
      links.splice(i, 1);
      return { ok: true, board: { entries, links } };
    }
    case "removeEntry": {
      const i = entries.findIndex((e) => e.id === cmd.entryId);
      if (i < 0 || entries[i]?.addedBy !== ctx.actor) return { ok: false, reason: "not yours" };
      const [removed] = entries.splice(i, 1);
      return { ok: true, board: { entries, links: links.filter((l) => l.from !== removed?.id && l.to !== removed?.id) } };
    }
    default:
      return { ok: false, reason: "unknown command" };
  }
}
