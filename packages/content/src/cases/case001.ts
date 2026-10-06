import type { SubjectInfoItem } from "@vanta/shared";

/** CASE_001 Subject as VANTA first reveals it. Original, fictional data. */
export const CASE_001_SUBJECT_SIGNAL: readonly SubjectInfoItem[] = [
  { id: "case001.subject.fullName", kind: "fullName", label: "Full name", value: "Elena Marsh Varga" },
  { id: "case001.subject.citizenId", kind: "citizenId", label: "Citizen ID", value: "CID 4471-2093-88" },
  { id: "case001.subject.photo", kind: "photo", label: "Face photo", value: "photo:subject_case001" },
  { id: "case001.subject.approxLocation", kind: "approxLocation", label: "Approximate location", value: "Calder district, between Harlow St and 5th Ave" },
];
