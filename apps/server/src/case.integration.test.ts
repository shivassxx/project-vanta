import type { Server } from "@colyseus/core";
import { Bot } from "@vanta/bots";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startGameServer } from "./createServer";

const PORT = 2605;
const endpoint = `ws://localhost:${PORT}`;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

let server: Server;
beforeAll(async () => {
  // 1 real second = 1000 case seconds: the 15-minute delay consequence fires in under a second.
  server = await startGameServer(PORT, { caseTimeScale: 1000, rng: () => 0 });
});
afterAll(async () => {
  await server.gracefullyShutdown(false);
});

describe("CASE_001 driven by the case engine", () => {
  it("delivers the first signal, then the delay consequence, to the IGL only", async () => {
    const a = new Bot({ endpoint });
    const room = await a.join();
    const b = new Bot({ endpoint, roomId: room.roomId });
    await b.join();
    let igl: Bot | undefined;
    for (let i = 0; i < 40 && !igl?.knowledge.some((k) => k.item.id === "case001.subject.locationUpdate"); i++) {
      await wait(100);
      igl = [a, b].find((x) => x.isIgl());
    }
    if (!igl) throw new Error("no igl");
    const ids = igl.knowledge.map((k) => k.item.id);
    expect(ids).toContain("case001.subject.fullName");
    expect(ids).toContain("case001.subject.locationUpdate");
    const other = igl === a ? b : a;
    expect(other.knowledge).toEqual([]);
    await a.leave();
    await b.leave();
  });
});
