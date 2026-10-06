import type { VehicleDef } from "@vanta/content/server";
import { VEHICLE_COLORS, VehicleState, type Vec2 } from "@vanta/shared";

/** Vehicles in one room's world. Plate and owner never go into public state. */
export class VehicleWorld {
  private readonly vehicles = new Map<string, VehicleDef>();

  constructor(defs: readonly VehicleDef[]) {
    for (const d of defs) this.vehicles.set(d.id, d);
  }

  populate(target: Map<string, VehicleState>): void {
    for (const d of this.vehicles.values()) {
      const v = new VehicleState();
      v.id = d.id;
      v.x = d.position.x;
      v.z = d.position.z;
      v.heading = d.heading;
      v.color = d.color;
      target.set(d.id, v);
    }
  }

  find(id: string): { pos: Vec2; conversation: string; observed: string } | undefined {
    const d = this.vehicles.get(id);
    if (!d) return undefined;
    const color = VEHICLE_COLORS.find((c) => c.id === d.color)?.name ?? "";
    return { pos: d.position, conversation: d.interaction, observed: `${color} ${d.model}` };
  }
}
