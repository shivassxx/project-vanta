import type { Server } from "@colyseus/core";
import { Bot } from "@vanta/bots";
import { MAX_PLAYERS, SPRINT_SPEED } from "@vanta/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startGameServer } from "./createServer";
import { sanitizeInput } from "./rooms/GameRoom";

const PORT = 2601;
const endpoint = `ws://localhost:${PORT}`;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

let server: Server;
beforeAll(async () => {
  server = await startGameServer(PORT);
});
afterAll(async () => {
  await server.gracefullyShutdown(false);
});

describe("sanitizeInput", () => {
  it("rejects malformed input and clamps the move axis", () => {
    expect(sanitizeInput({ seq: 1, x: "a", y: 0, yaw: 0 })).toBeUndefined();
    expect(sanitizeInput(null)).toBeUndefined();
    const m = sanitizeInput({ seq: 1, x: 100, y: 0, yaw: 0, sprint: true });
    expect(m?.x).toBeCloseTo(1);
  });
});

describe("game room with headless bots", () => {
  it("syncs two players in one room", async () => {
    const a = new Bot({ endpoint });
    const roomA = await a.join();
    const b = new Bot({ endpoint, roomId: roomA.roomId });
    await b.join();
    await wait(150);
    expect(roomA.state.players.size).toBe(2);
    expect(b.room?.state.players.get(a.sessionId)).toBeDefined();
    await a.leave();
    await b.leave();
  });

  it("moves bots on the server and caps speed regardless of input", async () => {
    const bot = new Bot({ endpoint });
    await bot.join();
    await wait(100);
    const start = bot.position();
    if (!start) throw new Error("no position");
    // Cheating attempt: oversized axis + sprint.
    for (let i = 0; i < 10; i++) {
      bot.sendInput({ x: 0, y: 50, sprint: true });
      await wait(50);
    }
    bot.sendInput({ x: 0, y: 0 });
    await wait(150);
    const end = bot.position();
    if (!end) throw new Error("no position");
    const moved = Math.hypot(end.x - start.x, end.z - start.z);
    expect(moved).toBeGreaterThan(0.5);
    expect(moved).toBeLessThanOrEqual(SPRINT_SPEED * 1.0); // ~0.75 s of sprinting at most
    await bot.leave();
  });

  it("caps a room at six players", async () => {
    const host = new Bot({ endpoint });
    const first = await host.join();
    const bots = [host, ...Array.from({ length: MAX_PLAYERS - 1 }, () => new Bot({ endpoint, roomId: first.roomId }))];
    for (const b of bots.slice(1)) await b.join();
    const extra = new Bot({ endpoint, roomId: first.roomId });
    await expect(extra.join()).rejects.toThrow();
    await Promise.all(bots.map((b) => b.leave()));
  });

  it("keeps a dropped player's slot and restores it on reconnect", async () => {
    const a = new Bot({ endpoint });
    const room = await a.join();
    const watcher = new Bot({ endpoint, roomId: room.roomId });
    await watcher.join();
    const id = a.sessionId;
    const token = a.drop();
    await wait(200);
    expect(watcher.room?.state.players.get(id)?.connected).toBe(false);
    await a.reconnect(token);
    await wait(200);
    expect(a.sessionId).toBe(id);
    expect(watcher.room?.state.players.get(id)?.connected).toBe(true);
    await a.leave();
    await watcher.leave();
  });
});
