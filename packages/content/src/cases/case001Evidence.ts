import type { EvidenceItem, Vec2 } from "@vanta/shared";

/** SERVER-ONLY. Physical evidence in the CASE_001 greybox and what it says once examined. */
export interface EvidenceSpotDef {
  /** Spot ID used in the world (public). */
  spotId: string;
  /** What anyone sees before examining it. */
  label: string;
  position: Vec2;
  /** Picked up = removed from the world for everyone once found. */
  pickUp: boolean;
  item: EvidenceItem;
}

export const CASE_001_EVIDENCE: readonly EvidenceSpotDef[] = [
  {
    spotId: "spot_cafe_table",
    label: "Receipt on a café table",
    position: { x: 10.6, z: 10.4 },
    pickUp: true,
    item: {
      id: "case001.ev.cafeReceipt",
      kind: "document",
      title: "Café receipt",
      description: "Two coffees, 08:12. Paid by card ending 4471. Someone wrote 'R.Y. THU' on the back in pen.",
    },
  },
  {
    spotId: "spot_park_bench",
    label: "Folded paper under a bench",
    position: { x: 10.6, z: -10.4 },
    pickUp: true,
    item: {
      id: "case001.ev.tornNote",
      kind: "document",
      title: "Torn note",
      description: "Half of a page: '...not safe at home anymore. Bring what you took. Rail yard, after dark.' No name, no date.",
    },
  },
  {
    spotId: "spot_office_lot",
    label: "Parking stub on the ground",
    position: { x: -10.6, z: -10.4 },
    pickUp: true,
    item: {
      id: "case001.ev.parkingStub",
      kind: "record",
      title: "Parking stub",
      description: "Calder Office Park, entry 07:48 today. Grey sedan, plate CAL-7Q34.",
    },
  },
];

