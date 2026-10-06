import type { ProfessionId } from "@vanta/shared";

/**
 * Backgrounds are not RPG classes: they describe access, contacts and restrictions.
 * Immutable content definitions; runtime assignment lives on the server.
 */
export interface ProfessionDef {
  id: ProfessionId;
  name: string;
  access: string;
  restriction: string;
}

export const PROFESSIONS: readonly ProfessionDef[] = [
  { id: "police_officer", name: "Police Officer", access: "Can request records and talk to precinct contacts.", restriction: "Every lookup leaves an access log." },
  { id: "doctor", name: "Doctor", access: "Hospital staff areas and medical records on request.", restriction: "Known by name at the city hospital." },
  { id: "journalist", name: "Journalist", access: "Press contacts and archive access.", restriction: "Some people refuse to talk to the press." },
  { id: "ex_intelligence", name: "Former Intelligence Officer", access: "Old contacts who may still answer.", restriction: "Old contacts may also be watching." },
  { id: "paramedic", name: "Paramedic", access: "Emergency dispatch knowledge and ambulance bay access.", restriction: "Shift schedule is on record." },
  { id: "lawyer", name: "Lawyer", access: "Court filings and client confidentiality.", restriction: "Bound by professional duties." },
  { id: "security_worker", name: "Security Worker", access: "Knows building security routines; may reach DVR rooms.", restriction: "Employer tracks badge use." },
  { id: "mechanic", name: "Mechanic", access: "Garage contacts and vehicle knowledge.", restriction: "Few official contacts." },
  { id: "taxi_driver", name: "Taxi Driver", access: "Knows streets, dispatch chatter and regular fares.", restriction: "Car is registered and recognizable." },
  { id: "ex_soldier", name: "Former Soldier", access: "Composure under threat; veteran network.", restriction: "Service record is easy to find." },
  { id: "it_worker", name: "IT Worker", access: "Knows how office systems are usually configured.", restriction: "Needs a real entry point; no magic hacking." },
  { id: "private_investigator", name: "Private Investigator", access: "Licensed to surveil and ask questions.", restriction: "Police are wary of PIs." },
  { id: "civilian", name: "Ordinary Civilian", access: "Nobody suspects you.", restriction: "No special access at all." },
];

export function getProfession(id: ProfessionId): ProfessionDef | undefined {
  return PROFESSIONS.find((p) => p.id === id);
}
