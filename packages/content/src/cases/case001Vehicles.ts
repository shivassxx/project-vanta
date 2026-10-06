import type { EvidenceItem, Vec2 } from "@vanta/shared";
import type { ConversationDef } from "../conversations/types";

/** SERVER-ONLY. Vehicles of CASE_001 and what can be learned from them. */
export interface VehicleDef {
  id: string;
  position: Vec2;
  heading: number;
  color: string;
  model: string;
  plate: string;
  /** Conversation-style interaction for examining the vehicle up close. */
  interaction: string;
}

export const CASE_001_VEHICLES: readonly VehicleDef[] = [
  {
    id: "veh_sedan",
    position: { x: -10.3, z: -6 },
    heading: 0,
    color: "car_grey",
    model: "Calder Motors Avenir sedan",
    plate: "CAL-7Q34",
    interaction: "vehicle_sedan",
  },
];

export const CASE_001_VEHICLE_EVIDENCE: readonly EvidenceItem[] = [
  {
    id: "case001.ev.sedanObserved",
    kind: "object",
    title: "Grey sedan, CAL-7Q34",
    description:
      "Calder Motors Avenir, grey, plate CAL-7Q34, parked by the office lot. Through the window: an office park permit, a grey coat folded on the back seat, a child's drawing in the sun visor.",
  },
  {
    id: "case001.ev.sedanRegistration",
    kind: "record",
    title: "Vehicle registration CAL-7Q34",
    description: "Registered owner: Raymond Yates, 58, 14 Alder Row, Calder. No other vehicles. No reported theft.",
  },
];

/** Examining the sedan. Forcing the door is a crime the case remembers. */
export const SEDAN_INTERACTION: ConversationDef = {
  id: "vehicle_sedan",
  start: "start",
  nodes: {
    start: {
      line: "A grey Calder Motors Avenir, parked nose-in. Plate CAL-7Q34.",
      options: [
        { id: "window", text: "Look through the window.", next: "window", gives: "case001.ev.sedanObserved" },
        { id: "force", text: "Force the driver's door. [crime]", next: "glovebox", gives: "case001.ev.sedanObserved" },
        { id: "leave", text: "Step back." },
      ],
    },
    window: {
      line: "An office park permit on the dash. A grey coat folded on the back seat. A child's drawing tucked into the sun visor.",
      options: [
        { id: "force", text: "Force the driver's door. [crime]", next: "glovebox" },
        { id: "leave", text: "Step back." },
      ],
    },
    glovebox: {
      line: "The lock gives. In the glovebox: the registration papers.",
      options: [{ id: "take", text: "Read the registration and close the door.", gives: "case001.ev.sedanRegistration" }],
    },
  },
};
