import type { EvidenceItem } from "@vanta/shared";
import { CASE_001_TESTIMONY } from "../conversations/case001Conversations";
import { CASE_001_EVIDENCE } from "./case001Evidence";

/** SERVER-ONLY. Every evidence item of CASE_001 by ID (physical + testimony). */
export const CASE_001_EVIDENCE_ITEMS: ReadonlyMap<string, EvidenceItem> = new Map(
  [...CASE_001_EVIDENCE.map((e) => e.item), ...CASE_001_TESTIMONY].map((i) => [i.id, i]),
);
