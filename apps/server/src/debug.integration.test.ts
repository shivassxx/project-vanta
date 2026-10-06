import type { Server } from "@colyseus/core";
import { Bot } from "@vanta/bots";
import { MSG_DEBUG, type DebugCaseState } from "@vanta/shared";
import { afterAll, describe, expect, it } from "vitest";
import { startGameServer } from "./createServer";
import { TEST_SPAWNS } from "./testSupport";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const servers: Server[] = [];
afterAll(async () => {
  for (const s of servers) await s.gracefullyShutdown(false);
});

const lastState = (b: Bot) => b.received.filter((m) => m.type === "debugState").at(-1)?.message as DebugCaseState | undefined;

describe("dev debug tools", () => {
  it("skip case time and report hidden case state to the requester only", async () => {
    servers.push(await startGameServer(2618, { spawnPoints: TEST_SPAWNS, debug: true, rng: () => 0 }));
    const a = new Bot({ endpoint: "ws://localhost:2618" });
    const room = await a.join();
    const b = new Bot({ endpoint: "ws://localhost:2618", roomId: room.roomId });
    await b.join();
    await wait(200);
    a.room?.send(MSG_DEBUG, { cmd: "advance", sec: 5 }); // past the 4 s first signal
    await wait(150);
    expect(lastState(a)?.stage).toBe("locate");
    a.room?.send(MSG_DEBUG, { cmd: "advance", sec: 900 }); // the delay consequence
    await wait(150);
    expect(lastState(a)?.stage).toBe("relocated");
    expect(a.knowledge.some((k) => k.item.id === "case001.subject.locationUpdate")).toBe(true);
    expect(lastState(b)).toBeUndefined();
    await Promise.all([a.leave(), b.leave()]);
  });

  it("is ignored when debug is off", async () => {
    servers.push(await startGameServer(2619, { spawnPoints: TEST_SPAWNS, debug: false }));
    const a = new Bot({ endpoint: "ws://localhost:2619" });
    await a.join();
    await wait(100);
    a.room?.send(MSG_DEBUG, { cmd: "state" });
    await wait(150);
    expect(lastState(a)).toBeUndefined();
    await a.leave();
  });
});
