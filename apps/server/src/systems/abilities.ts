import type { AbilityDef } from "@vanta/content/server";
import type { AbilityView, ProfessionId } from "@vanta/shared";

/** Abilities this player can use right now. Computed on the server; never trust the client. */
export function availableAbilities(
  defs: readonly AbilityDef[],
  profession: ProfessionId,
  holds: (evidenceId: string) => boolean,
  used: ReadonlySet<string>,
  knows: (infoId: string) => boolean = () => false,
): AbilityView[] {
  return defs
    .filter(
      (d) =>
        !used.has(d.id) &&
        (!d.professions || d.professions.includes(profession)) &&
        d.requiresAnyEvidence.some(holds) &&
        (d.requiresInfo ?? []).every(knows) &&
        !(d.grants && holds(d.grants)),
    )
    .map((d) => ({ id: d.id, label: d.label }));
}
