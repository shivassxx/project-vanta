import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { SqliteStore } from "./sqlite";
import { emptyWorld } from "./WorldRepository";

const tempDb = () => join(mkdtempSync(join(tmpdir(), "vanta-")), "test.sqlite");
const TOKEN = "secret-player-token-0123456789";
const record = { id: "char_aaaa", campaignId: "camp", professionId: "doctor", createdAt: 1 };
const item = { id: "ev1", kind: "document" as const, title: "Receipt", description: "Two coffees" };

describe("SqliteStore", () => {
  it("round-trips a character save (identity, knowledge, evidence) across reopen", () => {
    const path = tempDb();
    const a = new SqliteStore(path);
    a.insert(TOKEN, record);
    a.saveKnowledge(record.id, [{ item: { id: "i1", kind: "fullName", label: "Full name", value: "X" }, source: "vanta", receivedAt: 2 }]);
    a.saveEvidence(record.id, [{ item, foundBy: record.id, foundAt: 3 }]);
    a.close();

    const b = new SqliteStore(path);
    expect(b.findByToken(TOKEN)).toEqual(record);
    expect(b.findByToken("someone-else-token-000000")).toBeUndefined();
    expect(b.loadKnowledge(record.id).map((k) => k.item.id)).toEqual(["i1"]);
    expect(b.loadEvidence(record.id)).toEqual([{ item, foundBy: record.id, foundAt: 3 }]);
    expect(b.listByCampaign("camp").map((r) => r.id)).toEqual([record.id]);
    b.close();
  });

  it("never stores the raw player token", () => {
    const path = tempDb();
    const s = new SqliteStore(path);
    s.insert(TOKEN, record);
    s.close();
    expect(readFileSync(path).includes(Buffer.from(TOKEN))).toBe(false);
  });

  it("round-trips the campaign/world save", () => {
    const path = tempDb();
    const a = new SqliteStore(path);
    const w = emptyWorld("camp");
    w.people.subject = "gone";
    w.boards.case_001 = { entries: [{ id: "b1", kind: "note", title: "R.Y.?", text: "", addedBy: "char_aaaa" }], links: [] };
    w.usedAbilities.char_aaaa = ["runPlate"];
    a.save(w);
    a.close();
    const b = new SqliteStore(path);
    expect(b.load("camp")).toEqual(w);
    expect(b.load("other")).toEqual(emptyWorld("other"));
    b.close();
  });

  it("migrates an old world save and refuses saves from the future", () => {
    const path = tempDb();
    new SqliteStore(path).close();
    const raw = new Database(path);
    const v1 = { version: 1, campaignId: "old", cases: {}, vantaDelivered: {}, people: {}, policeAttention: {}, phone: {} };
    raw.prepare("INSERT INTO campaigns (id, data) VALUES (?, ?)").run("old", JSON.stringify(v1));
    raw.prepare("INSERT INTO campaigns (id, data) VALUES (?, ?)").run("future", JSON.stringify({ ...v1, campaignId: "future", version: 99 }));
    raw.close();
    const s = new SqliteStore(path);
    expect(s.load("old")).toEqual(emptyWorld("old"));
    expect(() => s.load("future")).toThrow(/newer/);
    s.close();
  });

  it("refuses a database written by a newer server", () => {
    const path = tempDb();
    new SqliteStore(path).close();
    const raw = new Database(path);
    raw.prepare("UPDATE meta SET value = '99' WHERE key = 'schema'").run();
    raw.close();
    expect(() => new SqliteStore(path)).toThrow(/newer/);
  });
});
