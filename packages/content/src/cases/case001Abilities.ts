import type { ProfessionId } from "@vanta/shared";

/** SERVER-ONLY. Background-specific actions. Availability is decided on the server. */
export interface AbilityDef {
  id: string;
  label: string;
  /** Omitted = anyone. */
  professions?: ProfessionId[];
  /** Available while the player holds any of these evidence items. */
  requiresAnyEvidence: string[];
  /** Also requires knowing these info items (e.g. the Subject's name). */
  requiresInfo?: string[];
  /** Evidence the player gets; omitted = none. */
  grants?: string;
  /** Case seconds until the result arrives (0 = immediately). */
  delaySec: number;
  /** Case engine event fired when used (e.g. an access log). */
  caseEvent: string;
}

const PLATE_EVIDENCE = ["case001.ev.parkingStub", "case001.ev.sedanObserved"];

export const CASE_001_ABILITIES: readonly AbilityDef[] = [
  {
    id: "runPlate",
    label: "Run plate CAL-7Q34 through the police database (logged)",
    professions: ["police_officer"],
    requiresAnyEvidence: PLATE_EVIDENCE,
    grants: "case001.ev.sedanRegistration",
    delaySec: 0,
    caseEvent: "police.plateLookup",
  },
  {
    id: "requestDmv",
    label: "Request the DMV record for CAL-7Q34 (licensed, takes a while)",
    professions: ["private_investigator"],
    requiresAnyEvidence: PLATE_EVIDENCE,
    grants: "case001.ev.sedanRegistration",
    delaySec: 60,
    caseEvent: "pi.dmvRequest",
  },
  {
    // Any player who knows her name and has something to show can call it in. The game never says if they should.
    id: "reportSubject",
    label: "Call Calder PD and report Elena Marsh Varga",
    requiresAnyEvidence: ["case001.ev.cafeCctv", "case001.ev.tornNote"],
    requiresInfo: ["case001.subject.fullName"],
    delaySec: 0,
    caseEvent: "police.report",
  },
];
