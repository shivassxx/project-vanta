import * as THREE from "three";
import { INTERACT_RANGE, type SpotState } from "@vanta/shared";
import type { Interactable } from "./interaction";

const geo = new THREE.BoxGeometry(0.35, 0.06, 0.25);
const mat = new THREE.MeshStandardMaterial({ color: 0xe8e2d0 });
const meshes = new Map<string, THREE.Mesh>();

/** Keeps a small placeholder object in the scene for each examinable spot. */
export function syncSpots(scene: THREE.Scene, spots: Map<string, SpotState>): void {
  for (const [id, s] of spots) {
    if (meshes.has(id)) continue;
    const m = new THREE.Mesh(geo, mat);
    m.position.set(s.x, 0.03, s.z);
    m.rotation.y = (s.x * 7 + s.z * 3) % Math.PI;
    scene.add(m);
    meshes.set(id, m);
  }
  for (const [id, m] of meshes) {
    if (!spots.has(id)) {
      scene.remove(m);
      meshes.delete(id);
    }
  }
}

export function spotInteractables(spots: Iterable<SpotState>): Interactable[] {
  const out: Interactable[] = [];
  for (const s of spots) out.push({ id: s.id, kind: "search", label: `Examine: ${s.label}`, position: { x: s.x, z: s.z }, range: INTERACT_RANGE });
  return out;
}
