import { CASE_001_ABILITIES, CASE_001_EVIDENCE_ITEMS } from "@vanta/content/server";
import { describe, expect, it } from "vitest";
import { availableAbilities } from "./abilities";

const holds = (...ids: string[]) => (id: string) => ids.includes(id);

describe("availableAbilities", () => {
  it("references only real evidence", () => {
    for (const a of CASE_001_ABILITIES) {
      expect(CASE_001_EVIDENCE_ITEMS.has(a.grants)).toBe(true);
      for (const r of a.requiresAnyEvidence) expect(CASE_001_EVIDENCE_ITEMS.has(r)).toBe(true);
    }
  });

  it("needs the right background and something with the plate on it", () => {
    const none = new Set<string>();
    expect(availableAbilities(CASE_001_ABILITIES, "police_officer", holds(), none)).toEqual([]);
    expect(availableAbilities(CASE_001_ABILITIES, "doctor", holds("case001.ev.parkingStub"), none)).toEqual([]);
    expect(availableAbilities(CASE_001_ABILITIES, "police_officer", holds("case001.ev.parkingStub"), none).map((a) => a.id)).toEqual(["runPlate"]);
    expect(availableAbilities(CASE_001_ABILITIES, "private_investigator", holds("case001.ev.sedanObserved"), none).map((a) => a.id)).toEqual(["requestDmv"]);
  });

  it("disappears once used or once the result is already held", () => {
    expect(availableAbilities(CASE_001_ABILITIES, "police_officer", holds("case001.ev.parkingStub"), new Set(["runPlate"]))).toEqual([]);
    expect(availableAbilities(CASE_001_ABILITIES, "police_officer", holds("case001.ev.parkingStub", "case001.ev.sedanRegistration"), new Set())).toEqual([]);
  });
});
