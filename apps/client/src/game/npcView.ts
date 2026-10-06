import * as THREE from "three";
import { hairHex, jacketHex, skinHex, type NpcState } from "@vanta/shared";

const BUILD_SCALE: Record<string, number> = { slim: 0.88, average: 1, heavy: 1.2 };

/** Placeholder person: jacket body, skin-tone head, hair cap. No labels, no markers. */
export function createNpcMesh(n: NpcState): THREE.Group {
  const g = new THREE.Group();
  const w = BUILD_SCALE[n.build] ?? 1;
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.33 * w, 0.85, 4, 8), new THREE.MeshStandardMaterial({ color: jacketHex(n.jacket) }));
  body.position.y = 0.75;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), new THREE.MeshStandardMaterial({ color: skinHex(n.skin) }));
  head.position.y = 1.6;
  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.215, 12, 10, 0, Math.PI * 2, 0, Math.PI / 1.9),
    new THREE.MeshStandardMaterial({ color: hairHex(n.hair) }),
  );
  hair.position.y = 1.62;
  g.add(body, head, hair);
  return g;
}
