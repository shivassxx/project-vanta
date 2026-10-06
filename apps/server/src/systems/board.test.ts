import type { Board, EvidenceItem } from "@vanta/shared";
import { describe, expect, it } from "vitest";
import { applyBoardCommand, emptyBoard, type BoardContext } from "./board";

const ev: EvidenceItem = { id: "ev1", kind: "document", title: "Receipt", description: "Two coffees" };
let n = 0;
const ctx = (actor: string, holds = true): BoardContext => ({
  actor,
  evidenceOf: (id) => (holds && id === "ev1" ? ev : undefined),
  infoOf: (id) => (id === "info1" ? { id, kind: "fullName", label: "Full name", value: "X" } : undefined),
  newId: () => `id${++n}`,
});

function ok(board: Board, cmd: unknown, c: BoardContext): Board {
  const r = applyBoardCommand(board, cmd, c);
  if (!r.ok) throw new Error(r.reason);
  return r.board;
}

describe("applyBoardCommand", () => {
  it("pins held evidence and known info, once each", () => {
    let b = ok(emptyBoard(), { type: "pinEvidence", evidenceId: "ev1" }, ctx("a"));
    b = ok(b, { type: "pinInfo", itemId: "info1" }, ctx("a"));
    expect(b.entries.map((e) => [e.kind, e.title, e.addedBy])).toEqual([
      ["evidence", "Receipt", "a"],
      ["info", "Full name", "a"],
    ]);
    expect(applyBoardCommand(b, { type: "pinEvidence", evidenceId: "ev1" }, ctx("b")).ok).toBe(false);
  });

  it("refuses to pin evidence the actor does not hold", () => {
    const r = applyBoardCommand(emptyBoard(), { type: "pinEvidence", evidenceId: "ev1" }, ctx("a", false));
    expect(r).toEqual({ ok: false, reason: "evidence not held" });
  });

  it("adds trimmed notes and rejects empty ones", () => {
    const b = ok(emptyBoard(), { type: "addNote", title: "  Who is R.Y.?  ", text: "x".repeat(1000) }, ctx("a"));
    expect(b.entries[0]?.title).toBe("Who is R.Y.?");
    expect(b.entries[0]?.text).toHaveLength(280);
    expect(applyBoardCommand(b, { type: "addNote", title: "   " }, ctx("a")).ok).toBe(false);
  });

  it("links existing entries only and lets only the author remove things", () => {
    let b = ok(emptyBoard(), { type: "addNote", title: "A" }, ctx("a"));
    b = ok(b, { type: "addNote", title: "B" }, ctx("b"));
    const [x, y] = b.entries;
    if (!x || !y) throw new Error("setup");
    expect(applyBoardCommand(b, { type: "link", from: x.id, to: "ghost", label: "" }, ctx("a")).ok).toBe(false);
    expect(applyBoardCommand(b, { type: "link", from: x.id, to: x.id, label: "" }, ctx("a")).ok).toBe(false);
    b = ok(b, { type: "link", from: x.id, to: y.id, label: "same person?" }, ctx("a"));
    const link = b.links[0];
    if (!link) throw new Error("no link");
    expect(applyBoardCommand(b, { type: "removeLink", linkId: link.id }, ctx("b")).ok).toBe(false);
    // Removing an entry also removes its links.
    b = ok(b, { type: "removeEntry", entryId: x.id }, ctx("a"));
    expect(b.links).toEqual([]);
  });

  it("does not mutate the input board and rejects junk", () => {
    const b = emptyBoard();
    applyBoardCommand(b, { type: "addNote", title: "A" }, ctx("a"));
    expect(b.entries).toEqual([]);
    expect(applyBoardCommand(b, null, ctx("a")).ok).toBe(false);
    expect(applyBoardCommand(b, { type: "hack" }, ctx("a")).ok).toBe(false);
  });
});
