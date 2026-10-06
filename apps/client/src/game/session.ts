import type { CharacterId, KnownInfo, PrivateProfile } from "@vanta/shared";

export interface Teammate {
  characterId: CharacterId;
  connected: boolean;
}

/** What this client knows; the React overlay renders it. Only ever filled from server data. */
export interface SessionView {
  profile?: PrivateProfile;
  knowledge: KnownInfo[];
  iglCharacterId: CharacterId;
  teammates: Teammate[];
}

type Listener = () => void;

export class SessionStore {
  private view: SessionView = { knowledge: [], iglCharacterId: "", teammates: [] };
  private readonly listeners = new Set<Listener>();

  get = (): SessionView => this.view;

  subscribe = (l: Listener): (() => void) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };

  update(patch: Partial<SessionView>): void {
    this.view = { ...this.view, ...patch };
    this.listeners.forEach((l) => l());
  }
}

/** Short, stable label for a character the player has no name for yet. */
export const shortId = (id: CharacterId) => id.slice(-4).toUpperCase();
