import type { Vec2 } from "@vanta/shared";

export type InteractionKind = "talk" | "inspect" | "photograph" | "open" | "search" | "pickUp" | "enterVehicle" | "useTerminal";

export interface Interactable {
  id: string;
  kind: InteractionKind;
  label: string;
  position: Vec2;
  range: number;
}

/** Nearest interactable in range and within a frontal cone of the player's facing (yaw, radians). */
export function findInteractable(
  from: Vec2,
  facingYaw: number,
  items: readonly Interactable[],
  coneCos = 0.2,
): Interactable | undefined {
  const fx = -Math.sin(facingYaw);
  const fz = -Math.cos(facingYaw);
  let best: Interactable | undefined;
  let bestDist = Infinity;
  for (const it of items) {
    const dx = it.position.x - from.x;
    const dz = it.position.z - from.z;
    const dist = Math.hypot(dx, dz);
    if (dist > it.range) continue;
    if (dist > 1e-6 && (dx * fx + dz * fz) / dist < coneCos) continue;
    if (dist < bestDist) {
      best = it;
      bestDist = dist;
    }
  }
  return best;
}
