import { getProfession } from "@vanta/content";
import type { PrivateProfile } from "@vanta/shared";

const PLAYER_TOKEN_KEY = "vanta.playerToken";

/** Client-held secret identifying this player's persistent character. */
export function getPlayerToken(): string {
  try {
    const existing = localStorage.getItem(PLAYER_TOKEN_KEY);
    if (existing) return existing;
  } catch {
    // storage unavailable: falls back to a per-page token (new character each load)
  }
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const token = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  try {
    localStorage.setItem(PLAYER_TOKEN_KEY, token);
  } catch {
    // see above
  }
  return token;
}

/** Private panel: only this player sees their background. */
export function renderProfile(el: HTMLElement | null, profile: PrivateProfile): void {
  if (!el) return;
  const def = getProfession(profile.professionId);
  el.textContent = "";
  const lines = [
    `CHARACTER ${profile.characterId}`,
    `BACKGROUND (private): ${def?.name ?? profile.professionId}`,
    def ? `+ ${def.access}` : "",
    def ? `- ${def.restriction}` : "",
  ];
  for (const line of lines.filter(Boolean)) {
    const div = document.createElement("div");
    div.textContent = line;
    el.appendChild(div);
  }
}
