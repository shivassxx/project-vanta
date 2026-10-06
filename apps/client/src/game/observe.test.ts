import { NpcState } from "@vanta/shared";
import { describe, expect, it } from "vitest";
import { npcInteractables, observationText } from "./observe";

function npc(id: string, x: number): NpcState {
  const n = new NpcState();
  n.id = id;
  n.x = x;
  n.skin = "skin_2";
  n.hair = "hair_brown";
  n.faceShape = "oval";
  n.jacket = "jacket_green";
  n.build = "slim";
  return n;
}

describe("observe", () => {
  it("lists one interactable per person at their current position", () => {
    const list = npcInteractables([npc("a", 1), npc("b", 2)]);
    expect(list.map((i) => [i.id, i.position.x])).toEqual([["a", 1], ["b", 2]]);
  });

  it("reports appearance only", () => {
    const text = observationText(npc("a", 0));
    expect(text).toBe("You see someone: slim build, oval face, medium skin, brown hair, olive green jacket.");
    expect(text.toLowerCase()).not.toContain("subject");
  });
});
