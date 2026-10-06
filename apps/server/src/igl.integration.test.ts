import type { Server } from "@colyseus/core";
import { Bot } from "@vanta/bots";
import { CASE_001_SUBJECT_SIGNAL } from "@vanta/content";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startGameServer } from "./createServer";

const PORT = 2603;
const endpoint = `ws://localhost:${PORT}`;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

let server: Server;
beforeAll(async () => {
  // rng 0: first connected character becomes IGL; a returning IGL is always restored.
  server = await startGameServer(PORT, { caseTimeScale: 100, rng: () => 0 });
});
afterAll(async () => {
  await server.gracefullyShutdown(false);
});

async function team(n: number): Promise<Bot[]> {
  const first = new Bot({ endpoint });
  const room = await first.join();
  const bots = [first];
  for (let i = 1; i < n; i++) {
    const b = new Bot({ endpoint, roomId: room.roomId });
    await b.join();
    bots.push(b);
  }
  await wait(250);
  return bots;
}

const leaveAll = (bots: Bot[]) => Promise.all(bots.map((b) => b.leave()));
const photo = CASE_001_SUBJECT_SIGNAL.find((i) => i.kind === "photo");
if (!photo) throw new Error("case001 photo missing");

describe("VANTA + IGL", () => {
  it("designates one IGL and sends the Subject signal only to them", async () => {
    const bots = await team(2);
    const igl = bots.filter((b) => b.isIgl());
    expect(igl).toHaveLength(1);
    expect(igl[0]?.knowledge.map((k) => k.item.id).sort()).toEqual(CASE_001_SUBJECT_SIGNAL.map((i) => i.id).sort());
    const other = bots.find((b) => !b.isIgl());
    expect(other?.knowledge).toEqual([]);
    // Nothing in the other player's traffic contains Subject data.
    const raw = JSON.stringify(other?.received);
    for (const item of CASE_001_SUBJECT_SIGNAL) expect(raw).not.toContain(item.value);
    await leaveAll(bots);
  });

  it("shares an item only with the teammates the IGL picked", async () => {
    const bots = await team(3);
    const igl = bots.find((b) => b.isIgl());
    const [b, c] = bots.filter((x) => !x.isIgl());
    if (!igl || !b || !c) throw new Error("team setup failed");
    igl.share(photo.id, [b.characterId]);
    await wait(150);
    expect(b.knowledge).toEqual([expect.objectContaining({ item: photo, source: "teammate", fromCharacterId: igl.characterId })]);
    expect(c.knowledge).toEqual([]);
    expect(JSON.stringify(c.received)).not.toContain(photo.value);
    await leaveAll(bots);
  });

  it("ignores share attempts from non-IGL players", async () => {
    const bots = await team(3);
    const igl = bots.find((x) => x.isIgl());
    const [b, c] = bots.filter((x) => !x.isIgl());
    if (!igl || !b || !c) throw new Error("team setup failed");
    igl.share(photo.id, [b.characterId]);
    await wait(100);
    b.share(photo.id, [c.characterId]); // only the IGL shares through this channel
    await wait(150);
    expect(c.knowledge).toEqual([]);
    await leaveAll(bots);
  });

  it("hands the role to a temporary IGL on disconnect and re-evaluates on return", async () => {
    const bots = await team(2);
    const igl = bots.find((x) => x.isIgl());
    const other = bots.find((x) => !x.isIgl());
    if (!igl || !other) throw new Error("team setup failed");
    const token = igl.drop();
    await wait(200);
    expect(other.room?.state.iglCharacterId).toBe(other.characterId);
    expect(other.knowledge.filter((k) => k.source === "vanta")).toHaveLength(CASE_001_SUBJECT_SIGNAL.length);
    await igl.reconnect(token);
    await wait(200);
    expect(other.room?.state.iglCharacterId).toBe(igl.characterId); // rng 0 -> restored
    await leaveAll(bots);
  });
});
