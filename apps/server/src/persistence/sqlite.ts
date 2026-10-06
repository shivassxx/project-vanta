import { createHash } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import type { CampaignId, CharacterId, FoundEvidence, KnownInfo } from "@vanta/shared";
import type { CharacterDataRepository } from "./CharacterDataRepository";
import type { CharacterRecord, CharacterRepository } from "./CharacterRepository";
import { runMigrations, type Migration } from "./migrations";
import { WORLD_STATE_VERSION, emptyWorld, migrateWorld, type WorldRepository, type WorldState } from "./WorldRepository";

/** Database layout version (tables), separate from the JSON save versions inside them. */
const DB_SCHEMA_VERSION = 1;

export const CHARACTER_SAVE_VERSION = 1;
export const CHARACTER_MIGRATIONS: readonly Migration[] = [];

/** Player character save: identity plus what the character knows and holds. */
export interface CharacterSave {
  version: number;
  id: CharacterId;
  campaignId: CampaignId;
  professionId: string;
  createdAt: number;
  knowledge: KnownInfo[];
  evidence: FoundEvidence[];
}

/** The token is a secret: only its hash is stored. */
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/**
 * SQLite storage (better-sqlite3, synchronous). Campaign/world saves and character saves are
 * separate rows; each stores versioned JSON and is migrated on load.
 */
export class SqliteStore implements CharacterRepository, CharacterDataRepository, WorldRepository {
  private readonly db: Database.Database;

  constructor(path: string) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.db = new Database(path);
    this.db.pragma("journal_mode = WAL");
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS characters (
        id TEXT PRIMARY KEY,
        token_hash TEXT NOT NULL UNIQUE,
        campaign_id TEXT NOT NULL,
        data TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS campaigns (id TEXT PRIMARY KEY, data TEXT NOT NULL);
    `);
    const row = this.db.prepare("SELECT value FROM meta WHERE key = 'schema'").get() as { value: string } | undefined;
    if (!row) this.db.prepare("INSERT INTO meta (key, value) VALUES ('schema', ?)").run(String(DB_SCHEMA_VERSION));
    else if (Number(row.value) > DB_SCHEMA_VERSION) throw new Error(`database schema ${row.value} is newer than supported ${DB_SCHEMA_VERSION}`);
  }

  close(): void {
    this.db.close();
  }

  // --- characters -----------------------------------------------------------

  private loadCharacter(id: CharacterId): CharacterSave | undefined {
    const row = this.db.prepare("SELECT data FROM characters WHERE id = ?").get(id) as { data: string } | undefined;
    return row ? runMigrations<CharacterSave>(JSON.parse(row.data), CHARACTER_SAVE_VERSION, CHARACTER_MIGRATIONS, `character ${id}`) : undefined;
  }

  private writeCharacter(save: CharacterSave): void {
    this.db.prepare("UPDATE characters SET data = ? WHERE id = ?").run(JSON.stringify(save), save.id);
  }

  findByToken(token: string): CharacterRecord | undefined {
    const row = this.db.prepare("SELECT id FROM characters WHERE token_hash = ?").get(hashToken(token)) as { id: string } | undefined;
    const save = row && this.loadCharacter(row.id);
    return save && { id: save.id, campaignId: save.campaignId, professionId: save.professionId, createdAt: save.createdAt };
  }

  insert(token: string, record: CharacterRecord): void {
    const save: CharacterSave = { version: CHARACTER_SAVE_VERSION, ...record, knowledge: [], evidence: [] };
    this.db
      .prepare("INSERT INTO characters (id, token_hash, campaign_id, data) VALUES (?, ?, ?, ?)")
      .run(record.id, hashToken(token), record.campaignId, JSON.stringify(save));
  }

  listByCampaign(campaignId: CampaignId): CharacterRecord[] {
    const rows = this.db.prepare("SELECT id FROM characters WHERE campaign_id = ?").all(campaignId) as { id: string }[];
    return rows.flatMap((r) => {
      const s = this.loadCharacter(r.id);
      return s ? [{ id: s.id, campaignId: s.campaignId, professionId: s.professionId, createdAt: s.createdAt }] : [];
    });
  }

  loadKnowledge(id: CharacterId): KnownInfo[] {
    return this.loadCharacter(id)?.knowledge ?? [];
  }

  saveKnowledge(id: CharacterId, list: KnownInfo[]): void {
    const save = this.loadCharacter(id);
    if (save) this.writeCharacter({ ...save, knowledge: list });
  }

  loadEvidence(id: CharacterId): FoundEvidence[] {
    return this.loadCharacter(id)?.evidence ?? [];
  }

  saveEvidence(id: CharacterId, list: FoundEvidence[]): void {
    const save = this.loadCharacter(id);
    if (save) this.writeCharacter({ ...save, evidence: list });
  }

  // --- campaign / world -----------------------------------------------------

  load(campaignId: CampaignId): WorldState {
    const row = this.db.prepare("SELECT data FROM campaigns WHERE id = ?").get(campaignId) as { data: string } | undefined;
    return row ? migrateWorld(JSON.parse(row.data)) : emptyWorld(campaignId);
  }

  save(state: WorldState): void {
    if (state.version !== WORLD_STATE_VERSION) throw new Error(`refusing to save world version ${state.version}`);
    this.db
      .prepare("INSERT INTO campaigns (id, data) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data")
      .run(state.campaignId, JSON.stringify(state));
  }
}
