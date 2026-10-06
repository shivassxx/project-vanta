import type { Server } from "@colyseus/core";
import { Bot } from "@vanta/bots";
import { CASE_001_SUBJECT, CASE_001_WITNESSES, type PersonDef } from "@vanta/content/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PROFESSIONS } from "@vanta/content";
import { TEST_SPAWNS } from "./testSupport";
import { startGameServer } from "./createServer";
import { InMemoryCharacterRepository } from "./persistence/CharacterRepository";
import { CharacterService } from "./systems/characters";
import type { SubjectEvent } from "./systems/subject/npcWorld";

const PORT = 2607;
const endpoint = `ws://localhost:${PORT}`;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const barista = CASE_001_WITNESSES.find((w) => w.key === "witness_barista");
if (!barista) throw new Error("no barista");
// Spawns: first player (0,8), second (2,8). Barista next to the first, Subject next to the second.
const people: PersonDef[] = [
  { ...barista, standAt: { x: -1, z: 6.5 } },
  { ...CASE_001_SUBJECT, standAt: { x: 3.5, z: 6.5 }, plan: [{ node: 1, dwellSec: Number.POSITIVE_INFINITY, note: "waiting" }] },
];
const subjectEvents: SubjectEvent[] = [];

let server: Server;
beforeAll(async () => {
  // Everyone is an ordinary civilian, so background-gated options never appear in this test.
  const civilian = PROFESSIONS.findIndex((p) => p.id === "civilian");
  const characters = new CharacterService(new InMemoryCharacterRepository(), "campaign_test", () => (civilian + 0.5) / PROFESSIONS.length);
  server = await startGameServer(PORT, { spawnPoints: TEST_SPAWNS, people, characters, caseTimeScale: 100, rng: () => 0, onSubjectEvent: (e) => subjectEvents.push(e) });
});
afterAll(async () => {
  await server.gracefullyShutdown(false);
});

describe("conversations", () => {
  it("gates options on the server, gives testimony, and spooks a confronted Subject", async () => {
    const igl = new Bot({ endpoint }); // rng 0 -> first player is IGL and receives the photo
    const room = await igl.join();
    const other = new Bot({ endpoint, roomId: room.roomId });
    await other.join();
    await wait(400);
    expect(igl.knowledge.some((k) => k.item.id === "case001.subject.photo")).toBe(true);

    const npcAt = (x: number) => [...room.state.npcs.values()].find((n) => n.x === x)?.id ?? "";
    const baristaId = npcAt(-1);
    const subjectId = npcAt(3.5);

    // Without the photo only the neutral option exists, and forging the hidden one does nothing.
    other.talk(baristaId); // ~3.4 m: within talking range
    await wait(150);
    expect(other.dialogue?.options.map((o) => o.id)).toEqual(["nothing"]);
    other.choose("photo");
    await wait(150);
    expect(other.dialogue?.line).toBe("Morning. What can I get you?");
    expect(other.evidence).toEqual([]);

    // The IGL shows the photo and gets the barista's statement as testimony.
    igl.talk(baristaId);
    await wait(150);
    expect(igl.dialogue?.observed).toContain("round face");
    expect(igl.dialogue?.options.map((o) => o.id)).toEqual(["photo", "name", "nothing"]);
    igl.choose("photo");
    await wait(150);
    expect(igl.dialogue?.line).toContain("grey coat");
    igl.choose("note");
    await wait(150);
    expect(igl.dialogue?.ended).toBe(true);
    expect(igl.evidence.map((e) => e.item.id)).toEqual(["case001.ev.baristaStatement"]);
    expect(JSON.stringify(other.received)).not.toContain("grey coat");

    // Walking up to the Subject and speaking is noticed immediately.
    other.talk(subjectId);
    await wait(150);
    expect(other.dialogue?.line).toBe("...Do I know you?");
    expect(subjectEvents.some((e) => e.type === "subject.noticed")).toBe(true);

    // Too far away to talk: no conversation starts.
    const far = new Bot({ endpoint, roomId: room.roomId });
    await far.join(); // spawns at (-2,8), ~10 m from the Subject
    await wait(100);
    far.talk(subjectId);
    await wait(150);
    expect(far.dialogue).toBeUndefined();
    await Promise.all([igl.leave(), other.leave(), far.leave()]);
  });
});
