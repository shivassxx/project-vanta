import * as THREE from "three";
import { GREYBOX_WALLS } from "@vanta/shared";
import type { Interactable } from "./interaction";

export interface Greybox {
  group: THREE.Group;
  interactables: Interactable[];
}

const materials = {
  wall: new THREE.MeshStandardMaterial({ color: 0x59626b }),
  prop: new THREE.MeshStandardMaterial({ color: 0x9a7b4f }),
};

/** Renders the shared greybox layout; collision data lives in @vanta/shared. */
export function buildGreybox(): Greybox {
  const group = new THREE.Group();
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({ color: 0x3a4148 }));
  ground.rotation.x = -Math.PI / 2;
  group.add(ground);
  for (const w of GREYBOX_WALLS) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w.maxX - w.minX, w.height, w.maxZ - w.minZ), materials[w.kind]);
    m.position.set((w.minX + w.maxX) / 2, w.height / 2, (w.minZ + w.maxZ) / 2);
    group.add(m);
  }
  return {
    group,
    interactables: [
      { id: "crate_01", kind: "inspect", label: "Inspect crate", position: { x: 5, z: -5 }, range: 2.2 },
      { id: "box_02", kind: "search", label: "Search boxes", position: { x: -6, z: 6 }, range: 2.2 },
    ],
  };
}
