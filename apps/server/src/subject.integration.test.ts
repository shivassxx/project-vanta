import type { Server } from "@colyseus/core";
import { Bot } from "@vanta/bots";
import { CASE_001_CIVILIANS, CASE_001_SUBJECT, CASE_001_WITNESSES } from "@vanta/content/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { TEST_SPAWNS } from "./testSupport";
import { startGameServer } from "./createServer";
import { RING_NODES } from "./systems/subject/ring";

const PORT = 2604;
const endpoint = `ws://localhost:${PORT}`;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

let server: Server;
beforeAll(async () => {
  server = await startGameServer(PORT, { spawnPoints: TEST_SPAWNS, npcTimeScale: 20 });
});
afterAll(async () => {
  await server.gracefullyShutdown(false);
});

describe("Subject in the world", () => {
  it("syncs all people with identical, label-free public state", async () => {
    const bot = new Bot({ endpoint });
    const room = await bot.join();
    await wait(200);
    const npcs = [...room.state.npcs.values()];
    expect(npcs).toHaveLength(1 + CASE_001_CIVILIANS.length + CASE_001_WITNESSES.length);
    const json = JSON.stringify(room.state.toJSON());
    for (const secret of ["suspicion", "isSubject", "subject", "plan", "evad", "coffee", "Elena"]) expect(json).not.toContain(secret);
    // Every NPC exposes the same field set: nothing marks the Subject.
    const keySets = new Set(npcs.map((n) => Object.keys(n.toJSON()).sort().join(",")));
    expect(keySets.size).toBe(1);
    await bot.leave();
  });

  it("moves the Subject along their schedule, visible only as position changes", async () => {
    const bot = new Bot({ endpoint });
    const room = await bot.join();
    await wait(200);
    const subject = [...room.state.npcs.values()].find((n) => n.jacket === CASE_001_SUBJECT.look.jacket && n.hair === CASE_001_SUBJECT.look.hair);
    if (!subject) throw new Error("subject not found by look");
    const start = { x: subject.x, z: subject.z };
    const coffee = RING_NODES[2];
    if (!coffee) throw new Error("no node");
    let reached = false;
    for (let i = 0; i < 60 && !reached; i++) {
      await wait(100);
      reached = Math.hypot(subject.x - coffee.x, subject.z - coffee.z) < 0.5;
    }
    expect(Math.hypot(subject.x - start.x, subject.z - start.z)).toBeGreaterThan(5);
    expect(reached).toBe(true);
    await bot.leave();
  });
});
