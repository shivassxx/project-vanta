import { PROFESSIONS } from "@vanta/content";
import { describe, expect, it } from "vitest";
import { InMemoryCharacterRepository } from "../persistence/CharacterRepository";
import { CharacterService, pickProfession } from "./characters";

describe("pickProfession", () => {
  it("maps the rng range onto the profession list", () => {
    expect(pickProfession(() => 0)).toBe(PROFESSIONS[0]?.id);
    expect(pickProfession(() => 0.999999)).toBe(PROFESSIONS[PROFESSIONS.length - 1]?.id);
    expect(pickProfession(() => 1)).toBe(PROFESSIONS[PROFESSIONS.length - 1]?.id);
  });
});

describe("CharacterService", () => {
  it("registers a character once per token and keeps its profession", () => {
    let n = 0;
    const repo = new InMemoryCharacterRepository();
    const svc = new CharacterService(repo, "campaign_test", () => (n++ % 2 === 0 ? 0 : 0.99));
    const a1 = svc.getOrCreate("token_a_0123456789");
    const a2 = svc.getOrCreate("token_a_0123456789");
    const b = svc.getOrCreate("token_b_0123456789");
    expect(a2).toEqual(a1);
    expect(b.id).not.toBe(a1.id);
    expect(a1.id).toMatch(/^char_[0-9a-f]{12}$/);
    expect(a1.professionId).not.toBe(b.professionId);
    expect(repo.listByCampaign("campaign_test").map((r) => r.id).sort()).toEqual([a1.id, b.id].sort());
  });

  it("exposes only id, campaign and profession in the private profile", () => {
    const svc = new CharacterService(new InMemoryCharacterRepository(), "c", () => 0);
    const profile = CharacterService.toPrivateProfile(svc.getOrCreate("token_c_0123456789"));
    expect(Object.keys(profile).sort()).toEqual(["campaignId", "characterId", "professionId"]);
  });
});
