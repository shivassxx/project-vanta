import { describeLook, type NpcLook, type NpcState } from "@vanta/shared";
import type { Interactable } from "./interaction";

export const lookOf = (n: NpcState): NpcLook => ({
  skin: n.skin,
  hair: n.hair,
  faceShape: n.faceShape as NpcLook["faceShape"],
  jacket: n.jacket,
  build: n.build as NpcLook["build"],
});

/** One "observe person" interactable per visible person. */
export function npcInteractables(npcs: Iterable<NpcState>): Interactable[] {
  const out: Interactable[] = [];
  for (const n of npcs) out.push({ id: n.id, kind: "inspect", label: "Observe person", position: { x: n.x, z: n.z }, range: 4 });
  return out;
}

/** Observation text: facts only, never "this is the Subject". */
export function observationText(n: NpcState): string {
  return `You see someone: ${describeLook(lookOf(n))}.`;
}
