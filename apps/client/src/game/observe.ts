import type { NpcState } from "@vanta/shared";
import type { Interactable } from "./interaction";

/** One "observe person" interactable per visible person. */
export function npcInteractables(npcs: Iterable<NpcState>): Interactable[] {
  const out: Interactable[] = [];
  for (const n of npcs) out.push({ id: n.id, kind: "inspect", label: n.down ? "Examine body" : "Talk", position: { x: n.x, z: n.z }, range: 4 });
  return out;
}
