import type { Server } from "@colyseus/core";
import { Bot } from "@vanta/bots";
import { CASE_001_DVR_SPOT, CASE_001_SUBJECT, CASE_001_WITNESSES, type PersonDef } from "@vanta/content/server";
import { afterAll, describe, expect, it } from "vitest";
import { startGameServer } from "./createServer";
import { InMemoryWorldRepository } from "./persistence/WorldRepository";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const servers: Server[] = [];
afterAll(async () => {
  for (const s of servers) await s.gracefullyShutdown(false);
});

const barista = CASE_001_WITNESSES.find((w) => w.key === "witness_barista");
if (!barista) throw new Error("no barista");
const dvrNearSpawn = { ...CASE_001_DVR_SPOT, position: { x: -1.5, z: 7 } };

async function forceDvr(bot: Bot): Promise<void> {
  bot.interact(dvrNearSpawn.spotId);
  await wait(150);
  bot.choose("break");
  await wait(150);
}

describe("police consequence", () => {
  it("contacts only the player who was seen committing a crime", async () => {
    const port = 2610;
    // The barista stands right next to the service door: she sees it happen.
    servers.push(await startGameServer(port, { caseTimeScale: 100, people: [{ ...barista, standAt: { x: -3, z: 6 } }], evidenceSpots: [dvrNearSpawn] }));
    const thief = new Bot({ endpoint: `ws://localhost:${port}` });
    const room = await thief.join();
    const other = new Bot({ endpoint: `ws://localhost:${port}`, roomId: room.roomId });
    await other.join();
    await wait(150);
    await forceDvr(thief);
    await wait(1200); // 90 case seconds at 100x
    expect(thief.phone).toHaveLength(1);
    expect(thief.phone[0]?.from).toBe("Calder PD, Det. Okafor");
    expect(thief.phone[0]?.text).toContain("back door");
    expect(other.phone).toEqual([]);
    expect(JSON.stringify(other.received)).not.toContain("Okafor");
    await Promise.all([thief.leave(), other.leave()]);
  });

  it("stays quiet when nobody saw it", async () => {
    const port = 2611;
    servers.push(await startGameServer(port, { caseTimeScale: 100, people: [], evidenceSpots: [dvrNearSpawn] }));
    const thief = new Bot({ endpoint: `ws://localhost:${port}` });
    await thief.join();
    await wait(150);
    await forceDvr(thief);
    await wait(1200);
    expect(thief.phone).toEqual([]);
    await thief.leave();
  });
});

describe("Subject escape and persistent world", () => {
  it("lets a spooked Subject leave, closes the case, and remembers it in the next room", async () => {
    const port = 2612;
    const world = new InMemoryWorldRepository();
    // The Subject waits at Harlow Street (node 1, right by the spawn) and returns there after evading.
    const subject: PersonDef = { ...CASE_001_SUBJECT, startNode: 1, plan: [{ node: 1, dwellSec: Number.POSITIVE_INFINITY, note: "waiting" }] };
    servers.push(await startGameServer(port, { world, people: [subject], caseTimeScale: 100, npcTimeScale: 20, rng: () => 0 }));
    const endpoint = `ws://localhost:${port}`;
    const igl = new Bot({ endpoint });
    const room = await igl.join();
    const other = new Bot({ endpoint, roomId: room.roomId });
    await other.join();
    await wait(300);
    const subjectId = [...room.state.npcs.keys()][0] ?? "";

    other.talk(subjectId); // first notice: wary, evades
    await wait(150);
    for (let i = 0; i < 60; i++) {
      const s = room.state.npcs.get(subjectId);
      if (s && Math.hypot(s.x - 0, s.z - 9) < 0.5) break; // back at node 1
      await wait(100);
    }
    other.talk(subjectId); // second notice: spooked, leaves the district
    for (let i = 0; i < 60 && room.state.npcs.size > 0; i++) await wait(100);
    expect(room.state.npcs.size).toBe(0);
    await wait(200);
    expect(igl.received.some((m) => m.type === "vantaNotice")).toBe(true);
    expect(other.received.some((m) => m.type === "vantaNotice")).toBe(false);
    await Promise.all([igl.leave(), other.leave()]);
    await wait(300);

    const stored = world.load("campaign_dev");
    expect(stored.people.subject).toBe("gone");
    expect(stored.cases.case_001?.outcome).toBe("subject_fled");

    // A new room in the same campaign: the Subject does not come back.
    const late = new Bot({ endpoint });
    const room2 = await late.join();
    await wait(200);
    expect(room2.roomId).not.toBe(room.roomId);
    expect(room2.state.npcs.size).toBe(0);
    await late.leave();
  }, 30000);
});
