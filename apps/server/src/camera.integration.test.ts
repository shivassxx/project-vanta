import type { Server } from "@colyseus/core";
import { Bot } from "@vanta/bots";
import { PROFESSIONS } from "@vanta/content";
import { CASE_001_DVR_SPOT, CASE_001_WITNESSES, type PersonDef } from "@vanta/content/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startGameServer } from "./createServer";
import { InMemoryCharacterRepository } from "./persistence/CharacterRepository";
import { CharacterService } from "./systems/characters";

const PORT = 2609;
const endpoint = `ws://localhost:${PORT}`;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const CCTV = "case001.ev.cafeCctv";

const order = ["security_worker", "doctor"].map((id) => PROFESSIONS.findIndex((p) => p.id === id));
let n = 0;
const rng = () => ((order[n++ % order.length] ?? 0) + 0.5) / PROFESSIONS.length;

const barista = CASE_001_WITNESSES.find((w) => w.key === "witness_barista");
if (!barista) throw new Error("no barista");
// Spawns: (0,8) and (2,8). Barista in front of the first player, the DVR door next to the second.
const people: PersonDef[] = [{ ...barista, standAt: { x: 0, z: 5.5 } }];

let server: Server;
beforeAll(async () => {
  server = await startGameServer(PORT, {
    characters: new CharacterService(new InMemoryCharacterRepository(), "campaign_test", rng),
    people,
    evidenceSpots: [{ ...CASE_001_DVR_SPOT, position: { x: 3, z: 6.5 } }],
  });
});
afterAll(async () => {
  await server.gracefullyShutdown(false);
});

describe("phone camera and CCTV", () => {
  it("captures what the server sees in frame, only for the photographer, with a cooldown", async () => {
    const guard = new Bot({ endpoint });
    const room = await guard.join();
    const doc = new Bot({ endpoint, roomId: room.roomId });
    await doc.join();
    await wait(200);

    guard.takePhoto(0); // facing -Z: the barista is 2.5 m ahead
    guard.takePhoto(0); // too soon: ignored
    await wait(200);
    const photos = guard.evidence.filter((e) => e.item.kind === "photo");
    expect(photos).toHaveLength(1);
    expect(photos[0]?.item.title).toMatch(/^Photo 08:0\d, on Harlow Street$/);
    expect(photos[0]?.item.description).toBe("A person, close: average build, round face, dark skin, black hair, tan jacket.");
    expect(doc.evidence).toEqual([]);

    guard.takePhoto(Math.PI); // facing +Z after the cooldown: nobody there
    await wait(1700);
    guard.takePhoto(Math.PI);
    await wait(200);
    expect(guard.evidence.filter((e) => e.item.kind === "photo").at(-1)?.item.description).not.toContain("tan jacket");

    // Convincing an employee: a security background can ask the barista for the footage.
    const baristaId = [...room.state.npcs.keys()][0] ?? "";
    guard.talk(baristaId);
    await wait(150);
    expect(guard.dialogue?.options.map((o) => o.id)).toContain("cctv");
    guard.choose("cctv");
    await wait(150);
    guard.choose("watch");
    await wait(150);
    expect(guard.evidence.map((e) => e.item.id)).toContain(CCTV);

    // Physical DVR access: anyone can force the door (a crime); the IT route stays hidden.
    doc.interact(CASE_001_DVR_SPOT.spotId);
    await wait(150);
    expect(doc.dialogue?.options.map((o) => o.id)).toEqual(["break", "leave"]);
    doc.choose("break");
    await wait(150);
    doc.choose("watch");
    await wait(150);
    expect(doc.evidence.map((e) => e.item.id)).toEqual([CCTV]);
    expect(room.state.spots.has(CASE_001_DVR_SPOT.spotId)).toBe(true); // the door stays
    await guard.leave();
    await doc.leave();
  }, 20000);
});
