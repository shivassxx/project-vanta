import type { KnownInfo } from "@vanta/shared";
import { describe, expect, it } from "vitest";
import { KnowledgeStore, checkShare } from "./knowledge";

const info: KnownInfo = {
  item: { id: "i1", kind: "fullName", label: "Full name", value: "X" },
  source: "vanta",
  receivedAt: 0,
};

describe("KnowledgeStore", () => {
  it("keeps knowledge per character and does not overwrite", () => {
    const k = new KnowledgeStore();
    expect(k.grant("a", info)).toBe(true);
    expect(k.grant("a", { ...info, source: "teammate" })).toBe(false);
    expect(k.list("a")).toEqual([info]);
    expect(k.list("b")).toEqual([]);
  });
});

describe("checkShare", () => {
  const k = new KnowledgeStore();
  k.grant("igl", info);
  const room = new Set(["igl", "b", "c"]);

  it("accepts a valid IGL share and dedupes recipients", () => {
    expect(checkShare({ itemId: "i1", toCharacterIds: ["b", "b"] }, "igl", "igl", k, room)).toEqual({ ok: true, recipients: ["b"] });
  });

  it("rejects non-IGL senders, unknown items, bad recipients and malformed input", () => {
    expect(checkShare({ itemId: "i1", toCharacterIds: ["c"] }, "b", "igl", k, room).ok).toBe(false);
    expect(checkShare({ itemId: "nope", toCharacterIds: ["b"] }, "igl", "igl", k, room).ok).toBe(false);
    expect(checkShare({ itemId: "i1", toCharacterIds: ["igl"] }, "igl", "igl", k, room).ok).toBe(false);
    expect(checkShare({ itemId: "i1", toCharacterIds: ["outsider"] }, "igl", "igl", k, room).ok).toBe(false);
    expect(checkShare({ itemId: "i1", toCharacterIds: [] }, "igl", "igl", k, room).ok).toBe(false);
    expect(checkShare({ itemId: 5 }, "igl", "igl", k, room).ok).toBe(false);
  });
});
