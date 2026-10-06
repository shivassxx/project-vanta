import type { CharacterId, KnownInfo, ShareRequest, SubjectInfoItem } from "@vanta/shared";

/** What each character knows. Server-only; each client receives only its own list. */
export class KnowledgeStore {
  private readonly byCharacter = new Map<CharacterId, Map<string, KnownInfo>>();

  /** Returns true if this was new to the character. Existing knowledge is not overwritten. */
  grant(characterId: CharacterId, info: KnownInfo): boolean {
    let known = this.byCharacter.get(characterId);
    if (!known) {
      known = new Map();
      this.byCharacter.set(characterId, known);
    }
    if (known.has(info.item.id)) return false;
    known.set(info.item.id, info);
    return true;
  }

  get(characterId: CharacterId, itemId: string): SubjectInfoItem | undefined {
    return this.byCharacter.get(characterId)?.get(itemId)?.item;
  }

  list(characterId: CharacterId): KnownInfo[] {
    return [...(this.byCharacter.get(characterId)?.values() ?? [])];
  }
}

export type ShareCheck = { ok: true; recipients: CharacterId[] } | { ok: false; reason: string };

/** Validates an untrusted share request from `sender`. */
export function checkShare(
  raw: unknown,
  sender: CharacterId,
  igl: CharacterId | undefined,
  knowledge: KnowledgeStore,
  inRoom: ReadonlySet<CharacterId>,
): ShareCheck {
  const req = raw as Partial<ShareRequest> | null;
  if (!req || typeof req.itemId !== "string" || !Array.isArray(req.toCharacterIds)) return { ok: false, reason: "malformed" };
  if (sender !== igl) return { ok: false, reason: "not igl" };
  if (!knowledge.get(sender, req.itemId)) return { ok: false, reason: "item unknown to sender" };
  const recipients = [...new Set(req.toCharacterIds)].filter((id): id is string => typeof id === "string");
  if (recipients.length === 0) return { ok: false, reason: "no recipients" };
  if (recipients.some((id) => id === sender || !inRoom.has(id))) return { ok: false, reason: "invalid recipient" };
  return { ok: true, recipients };
}
