import { BARISTA, SMOKER } from "@vanta/content/server";
import { describe, expect, it } from "vitest";
import { choose, nodeView, type TalkerContext } from "./conversations";

const ctx = (over: Partial<TalkerContext> = {}): TalkerContext => ({
  hasEvidence: () => false,
  knowsInfo: () => false,
  profession: "civilian",
  ...over,
});

describe("conversations", () => {
  it("shows only options the player qualifies for", () => {
    expect(nodeView(BARISTA, "start", ctx())?.options.map((o) => o.id)).toEqual(["nothing"]);
    const withPhoto = ctx({ knowsInfo: (id) => id === "case001.subject.photo" });
    expect(nodeView(BARISTA, "start", withPhoto)?.options.map((o) => o.id)).toEqual(["photo", "nothing"]);
  });

  it("rejects hidden or unknown options even if a client sends them", () => {
    expect(choose(BARISTA, "start", "photo", ctx()).ok).toBe(false);
    expect(choose(BARISTA, "start", "nope", ctx()).ok).toBe(false);
  });

  it("follows the tree and reports testimony", () => {
    const c = ctx({ knowsInfo: () => true });
    const first = choose(BARISTA, "start", "photo", c);
    expect(first.ok && first.next).toBe("recognize");
    const second = choose(BARISTA, "recognize", "note", c);
    expect(second.ok && second.option.gives).toBe("case001.ev.baristaStatement");
    expect(second.ok && second.next).toBeUndefined();
  });

  it("gates pressing the deceptive witness on background", () => {
    const base = { knowsInfo: () => true };
    expect(nodeView(SMOKER, "lie", ctx(base))?.options.map((o) => o.id)).toEqual(["ok"]);
    expect(nodeView(SMOKER, "lie", ctx({ ...base, profession: "police_officer" }))?.options.map((o) => o.id)).toEqual(["ok", "press"]);
  });
});
