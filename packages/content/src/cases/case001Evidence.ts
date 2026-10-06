import type { EvidenceItem, Vec2 } from "@vanta/shared";
import type { ConversationDef } from "../conversations/types";

/** SERVER-ONLY. Physical evidence in the CASE_001 greybox and what it says once examined. */
export interface EvidenceSpotDef {
  /** Spot ID used in the world (public). */
  spotId: string;
  /** What anyone sees before examining it. */
  label: string;
  position: Vec2;
  /** Picked up = removed from the world for everyone once found. */
  pickUp: boolean;
  /** Plain evidence found by examining. Omitted when `interaction` is used instead. */
  item?: EvidenceItem;
  /** Examining opens this conversation-style interaction instead of handing over an item. */
  interaction?: string;
}

export const CASE_001_EVIDENCE_SPOTS_BASE: readonly EvidenceSpotDef[] = [
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

/** Physical DVR access: the believable way in for people without authority. */
export const CASE_001_DVR_SPOT: EvidenceSpotDef = {
  spotId: "spot_cafe_backdoor",
  label: "Service door behind the café",
  position: { x: 11.3, z: 4.5 },
  pickUp: false,
  interaction: "dvr_cafe",
};

export const DVR_INTERACTION: ConversationDef = {
  id: "dvr_cafe",
  start: "start",
  nodes: {
    start: {
      line: "A locked service door. Through the gap: a recorder blinking on a shelf, wired to the café cameras.",
      options: [
        { id: "break", text: "Force the lock and copy this morning's footage. [crime]", next: "copied" },
        {
          id: "port",
          text: "You know this kind of recorder. Reach its maintenance port through the gap. [crime, IT background]",
          requires: { profession: ["it_worker"] },
          next: "copied",
        },
        { id: "leave", text: "Leave it." },
      ],
    },
    copied: {
      line: "A few minutes later you have this morning's footage on your phone.",
      options: [{ id: "watch", text: "Watch it.", gives: "case001.ev.cafeCctv" }],
    },
  },
};

export const CASE_001_EVIDENCE: readonly EvidenceSpotDef[] = [...CASE_001_EVIDENCE_SPOTS_BASE, CASE_001_DVR_SPOT];
