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
