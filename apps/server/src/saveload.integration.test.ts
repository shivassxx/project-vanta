import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Bot } from "@vanta/bots";
import { CASE_001_EVIDENCE } from "@vanta/content/server";
import { describe, expect, it } from "vitest";
import { sqliteOptions, startGameServer } from "./createServer";
import { SqliteStore } from "./persistence/sqlite";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const receipt = CASE_001_EVIDENCE.find((e) => e.item?.id === "case001.ev.cafeReceipt");
if (!receipt) throw new Error("no receipt");
const spots = [{ ...receipt, position: { x: -1.5, z: 7 } }];

describe("save/load across a server restart", () => {
  it("brings back the same characters, knowledge, evidence, board and case progress", async () => {
    const path = join(mkdtempSync(join(tmpdir(), "vanta-")), "restart.sqlite");

    // --- first run ---
    let store = new SqliteStore(path);
    let server = await startGameServer(2616, { ...sqliteOptions(store), caseTimeScale: 100, rng: () => 0, people: [], evidenceSpots: spots });
    const a = new Bot({ endpoint: "ws://localhost:2616" });
    const room = await a.join();
    const b = new Bot({ endpoint: "ws://localhost:2616", roomId: room.roomId });
    await b.join();
    await wait(400); // IGL designated, first signal delivered
    a.interact(receipt.spotId);
    await wait(150);
    a.boardCommand({ type: "pinEvidence", evidenceId: "case001.ev.cafeReceipt" });
    b.boardCommand({ type: "addNote", title: "R.Y. THU?", text: "" });
    await wait(200);
    const before = { profileA: a.profile, profileB: b.profile, knowledgeA: a.knowledge.map((k) => k.item.id).sort(), board: a.board };
    expect(before.knowledgeA).toHaveLength(4);
    expect(before.board.entries).toHaveLength(2);
    await Promise.all([a.leave(), b.leave()]);
    await server.gracefullyShutdown(false);
    store.close();

    // --- second run: a fresh process would do exactly this ---
    store = new SqliteStore(path);
    server = await startGameServer(2617, { ...sqliteOptions(store), caseTimeScale: 100, rng: () => 0, people: [], evidenceSpots: spots });
    const a2 = new Bot({ endpoint: "ws://localhost:2617", playerToken: a.playerToken });
    const room2 = await a2.join();
    const b2 = new Bot({ endpoint: "ws://localhost:2617", roomId: room2.roomId, playerToken: b.playerToken });
    await b2.join();
    await wait(400);
    expect(a2.profile).toEqual(before.profileA);
    expect(b2.profile).toEqual(before.profileB);
    expect(a2.knowledge.map((k) => k.item.id).sort()).toEqual(before.knowledgeA);
    expect(a2.evidence.map((e) => e.item.id)).toEqual(["case001.ev.cafeReceipt"]);
    expect(b2.evidence).toEqual([]);
    expect(a2.board).toEqual(before.board);
    // New board entries continue after the saved IDs.
    b2.boardCommand({ type: "addNote", title: "Second note", text: "" });
    await wait(150);
    expect(new Set(b2.board.entries.map((e) => e.id)).size).toBe(3);
    // The case resumed: still in progress, not restarted.
    const stage = store.load("campaign_dev").cases.case_001?.stage;
    expect(stage).toBe("locate");
    await Promise.all([a2.leave(), b2.leave()]);
    await server.gracefullyShutdown(false);
    store.close();
  }, 20000);
});
