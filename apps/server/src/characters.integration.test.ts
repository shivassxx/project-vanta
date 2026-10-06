import type { Server } from "@colyseus/core";
import { Bot } from "@vanta/bots";
import { Client } from "colyseus.js";
import { GAME_ROOM_NAME } from "@vanta/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { TEST_SPAWNS } from "./testSupport";
import { startGameServer } from "./createServer";

const PORT = 2602;
const endpoint = `ws://localhost:${PORT}`;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

let server: Server;
beforeAll(async () => {
  server = await startGameServer(PORT, { spawnPoints: TEST_SPAWNS });
});
afterAll(async () => {
  await server.gracefullyShutdown(false);
});

describe("characters over the network", () => {
  it("rejects joins without a valid player token", async () => {
    const client = new Client(endpoint);
    await expect(client.joinOrCreate(GAME_ROOM_NAME)).rejects.toThrow();
    await expect(client.joinOrCreate(GAME_ROOM_NAME, { playerToken: "short" })).rejects.toThrow();
  });

  it("sends each private profile only to its owner", async () => {
    const a = new Bot({ endpoint });
    const room = await a.join();
    const b = new Bot({ endpoint, roomId: room.roomId });
    await b.join();
    await wait(200);
    if (!a.profile || !b.profile) throw new Error("profiles not received");

    const profilesSeenByA = a.received.filter((m) => m.type === "privateProfile");
    expect(profilesSeenByA).toEqual([{ type: "privateProfile", message: a.profile }]);
    expect(b.received.filter((m) => m.type === "privateProfile")).toEqual([{ type: "privateProfile", message: b.profile }]);

    // Public state carries the stable character ID but never the profession.
    const pub = JSON.stringify(a.room?.state.toJSON());
    expect(pub).toContain(b.profile.characterId);
    expect(pub).not.toContain("profession");
    await a.leave();
    await b.leave();
  });

  it("returns the same character and profession for the same token", async () => {
    const first = new Bot({ endpoint });
    await first.join();
    await wait(100);
    const profile = first.profile;
    await first.leave();
    await wait(100);
    const again = new Bot({ endpoint, playerToken: first.playerToken });
    await again.join();
    await wait(100);
    expect(again.profile).toEqual(profile);
    await again.leave();
  });

  it("rejects a second concurrent session of the same character", async () => {
    const a = new Bot({ endpoint });
    const room = await a.join();
    const dup = new Bot({ endpoint, roomId: room.roomId, playerToken: a.playerToken });
    await expect(dup.join()).rejects.toThrow();
    await a.leave();
  });

  it("re-sends the private profile after reconnect", async () => {
    const a = new Bot({ endpoint });
    await a.join();
    await wait(100);
    const profile = a.profile;
    a.profile = undefined;
    const token = a.drop();
    await wait(150);
    await a.reconnect(token);
    await wait(150);
    expect(a.profile).toEqual(profile);
    await a.leave();
  });
});
