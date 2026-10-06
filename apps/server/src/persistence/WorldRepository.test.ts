import { describe, expect, it } from "vitest";
import { InMemoryWorldRepository, emptyWorld, migrateWorld } from "./WorldRepository";

describe("InMemoryWorldRepository", () => {
  it("returns an empty, versioned world for a new campaign", () => {
    expect(new InMemoryWorldRepository().load("c1")).toEqual(emptyWorld("c1"));
  });

  it("round-trips state and isolates callers from stored data", () => {
    const repo = new InMemoryWorldRepository();
    const w = emptyWorld("c1");
    w.people.subject = "gone";
    repo.save(w);
    w.people.subject = "dead"; // mutating after save must not leak into storage
    expect(repo.load("c1").people.subject).toBe("gone");
    expect(repo.load("c2").people).toEqual({});
  });

  it("refuses to silently load a newer version", () => {
    const repo = new InMemoryWorldRepository();
    repo.save({ ...emptyWorld("c1"), version: 99 });
    expect(() => repo.load("c1")).toThrow(/newer/);
  });

  it("migrates a v1 world save to the current version", () => {
    const v1 = { version: 1, campaignId: "c1", cases: {}, vantaDelivered: {}, people: { subject: "gone" }, policeAttention: {}, phone: {} };
    expect(migrateWorld(v1)).toEqual({ ...emptyWorld("c1"), people: { subject: "gone" } });
  });
});
