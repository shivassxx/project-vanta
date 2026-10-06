import type { AbilityDef } from "@vanta/content/server";
import type { AbilityView, ProfessionId } from "@vanta/shared";

/** Abilities this player can use right now. Computed on the server; never trust the client. */
export function availableAbilities(
  defs: readonly AbilityDef[],
  profession: ProfessionId,
  holds: (evidenceId: string) => boolean,
  used: ReadonlySet<string>,
): AbilityView[] {
  return defs
    .filter((d) => !used.has(d.id) && d.professions.includes(profession) && d.requiresAnyEvidence.some(holds) && !holds(d.grants))
    .map((d) => ({ id: d.id, label: d.label }));
}
