import { CASE_001_EVIDENCE } from "@vanta/content/server";
import { SpotState } from "@vanta/shared";
import { describe, expect, it } from "vitest";
import { EvidenceStore, EvidenceWorld } from "./evidence";

const spot = CASE_001_EVIDENCE[0];
if (!spot?.item) throw new Error("no evidence");
const item = spot.item;

describe("EvidenceWorld", () => {
  it("publishes only id, position and visible label", () => {
    const spots = new Map<string, SpotState>();
    new EvidenceWorld(CASE_001_EVIDENCE).populate(spots);
    const json = JSON.stringify([...spots.values()].map((s) => s.toJSON()));
    expect(json).toContain(spot.label);
    for (const d of CASE_001_EVIDENCE) if (d.item) expect(json).not.toContain(d.item.description);
  });

  it("requires being close and removes picked-up evidence", () => {
    const w = new EvidenceWorld(CASE_001_EVIDENCE);
    expect(w.examine(spot.spotId, { x: 0, z: 0 })).toEqual({ ok: false, reason: "too far" });
    const r = w.examine(spot.spotId, { x: spot.position.x - 1, z: spot.position.z });
    expect(r.ok && r.def.item?.id).toBe(item.id);
    expect(w.examine(spot.spotId, spot.position)).toEqual({ ok: false, reason: "unknown" });
    expect(w.examine(42, spot.position)).toEqual({ ok: false, reason: "unknown" });
  });
});

describe("EvidenceStore", () => {
  it("keeps evidence per character", () => {
    const s = new EvidenceStore();
    expect(s.grant("a", { item: item, foundBy: "a", foundAt: 0 })).toBe(true);
    expect(s.grant("a", { item: item, foundBy: "a", foundAt: 1 })).toBe(false);
    expect(s.list("b")).toEqual([]);
    expect(s.has("a", item.id)?.foundAt).toBe(0);
  });
});
