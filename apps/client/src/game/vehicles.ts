import * as THREE from "three";
import { vehicleHex, type VehicleState } from "@vanta/shared";
import type { Interactable } from "./interaction";

const meshes = new Map<string, THREE.Group>();
const glass = new THREE.MeshStandardMaterial({ color: 0x1c2228 });

/** Placeholder car: body + cabin. Plates are not rendered; players read them up close. */
function createCar(v: VehicleState): THREE.Group {
  const g = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({ color: vehicleHex(v.color) });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.7, 4.2), paint);
  body.position.y = 0.55;
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.55, 2.2), glass);
  cabin.position.set(0, 1.15, -0.2);
  g.add(body, cabin);
  return g;
}

export function syncVehicles(scene: THREE.Scene, vehicles: Map<string, VehicleState>): void {
  for (const [id, v] of vehicles) {
    let m = meshes.get(id);
    if (!m) {
      m = createCar(v);
      scene.add(m);
      meshes.set(id, m);
    }
    m.position.set(v.x, 0, v.z);
    m.rotation.y = v.heading;
  }
  for (const [id, m] of meshes) {
    if (!vehicles.has(id)) {
      scene.remove(m);
      meshes.delete(id);
    }
  }
}

export function vehicleInteractables(vehicles: Iterable<VehicleState>): Interactable[] {
  const out: Interactable[] = [];
  for (const v of vehicles) out.push({ id: v.id, kind: "inspect", label: "Examine vehicle", position: { x: v.x, z: v.z }, range: 3.5 });
  return out;
}
