/** A private action this player can take because of their background and what they hold. */
export interface AbilityView {
  id: string;
  label: string;
}

/** Server -> one client: abilities currently available to this player only. */
export const MSG_ABILITIES = "abilities";
export const MSG_USE_ABILITY = "useAbility";
