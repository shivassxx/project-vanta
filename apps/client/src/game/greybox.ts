import * as THREE from "three";
import type { Box2 } from "./movement";
import type { Interactable } from "./interaction";

export interface Greybox {
  group: THREE.Group;
  colliders: Box2[];
  interactables: Interactable[];
}

const wallMat = new THREE.MeshStandardMaterial({ color: 0x59626b });
const propMat = new THREE.MeshStandardMaterial({ color: 0x9a7b4f });

function addBox(g: Greybox, mat: THREE.Material, cx: number, cz: number, w: number, d: number, h: number): void {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(cx, h / 2, cz);
  g.group.add(m);
  g.colliders.push({ minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2 });
}

/** A small walled yard with a few props and two interactables. */
export function buildGreybox(): Greybox {
  const g: Greybox = { group: new THREE.Group(), colliders: [], interactables: [] };
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({ color: 0x3a4148 }));
  ground.rotation.x = -Math.PI / 2;
  g.group.add(ground);
  addBox(g, wallMat, 0, -12, 24, 0.5, 3);
  addBox(g, wallMat, 0, 12, 24, 0.5, 3);
  addBox(g, wallMat, -12, 0, 0.5, 24, 3);
  addBox(g, wallMat, 12, 0, 0.5, 24, 3);
  addBox(g, wallMat, -4, -3, 6, 0.5, 3);
  addBox(g, propMat, 5, -5, 1.5, 1.5, 1.5);
  addBox(g, propMat, -6, 6, 2, 1, 1);
  g.interactables.push(
    { id: "crate_01", kind: "inspect", label: "Inspect crate", position: { x: 5, z: -5 }, range: 2.2 },
    { id: "box_02", kind: "search", label: "Search boxes", position: { x: -6, z: 6 }, range: 2.2 },
  );
  return g;
}
