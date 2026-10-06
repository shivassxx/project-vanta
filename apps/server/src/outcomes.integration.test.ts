import type { Server } from "@colyseus/core";
import { Bot } from "@vanta/bots";
import { CASE_001_DVR_SPOT, CASE_001_EVIDENCE, CASE_001_SUBJECT, CASE_001_WITNESSES, type PersonDef } from "@vanta/content/server";
import { afterAll, describe, expect, it } from "vitest";
import { startGameServer } from "./createServer";
import { InMemoryWorldRepository } from "./persistence/WorldRepository";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const servers: Server[] = [];
afterAll(async () => {
  for (const s of servers) await s.gracefullyShutdown(false);
});

// Spawns: (0,8), (2,8). The Subject waits right in front of the first player.
const subjectNearby: PersonDef = { ...CASE_001_SUBJECT, startNode: 1, standAt: { x: 0, z: 6.5 }, plan: [{ node: 1, dwellSec: Number.POSITIVE_INFINITY, note: "waiting" }] };
const tornNote = CASE_001_EVIDENCE.find((e) => e.item?.id === "case001.ev.tornNote");
if (!tornNote) throw new Error("no torn note");

async function team(port: number) {
  const endpoint = `ws://localhost:${port}`;
  const igl = new Bot({ endpoint }); // rng 0: the first player is IGL and learns her name
  const room = await igl.join();
  const other = new Bot({ endpoint, roomId: room.roomId });
  await other.join();
  await wait(300);
  return { igl, other, room };
}

describe("CASE_001 interventions", () => {
  it("warning her closes the case as warned; she leaves", async () => {
    const port = 2613;
    servers.push(
      await startGameServer(port, {
        people: [subjectNearby],
        evidenceSpots: [{ ...CASE_001_DVR_SPOT, position: { x: -1.5, z: 8.5 } }],
        caseTimeScale: 100,
        rng: () => 0,
      }),
    );
    const { igl, other, room } = await team(port);
    igl.interact(CASE_001_DVR_SPOT.spotId); // get the footage the hard way
    await wait(150);
    igl.choose("break");
    await wait(150);
    igl.choose("watch");
    await wait(150);
    const subjectId = [...room.state.npcs.keys()][0] ?? "";
    igl.talk(subjectId);
    await wait(150);
    expect(igl.dialogue?.options.map((o) => o.id)).toEqual(["sorry", "name", "warn", "envelope"]);
    igl.choose("warn");
    await wait(150);
    expect(igl.dialogue?.line).toContain("I've known since Tuesday");
    igl.choose("go");
    await wait(200);
    expect(igl.evidence.map((e) => e.item.id)).toContain("case001.ev.subjectWords");
    expect(igl.received.some((m) => m.type === "vantaNotice")).toBe(true);
    for (let i = 0; i < 100 && room.state.npcs.size > 0; i++) await wait(100);
    expect(room.state.npcs.size).toBe(0); // she walked out of the district
    await Promise.all([igl.leave(), other.leave()]);
  }, 20000);

  it("reporting her to the police closes the case as reported", async () => {
    const port = 2614;
    const world = new InMemoryWorldRepository();
    servers.push(
      await startGameServer(port, {
        world,
        people: [subjectNearby],
        evidenceSpots: [{ ...tornNote, position: { x: -1.5, z: 8.5 } }],
        caseTimeScale: 100,
        rng: () => 0,
      }),
    );
    const { igl, other } = await team(port);
    expect(igl.abilities).toEqual([]);
    igl.interact(tornNote.spotId);
    await wait(200);
    expect(igl.abilities.map((a) => a.id)).toContain("reportSubject");
    expect(other.abilities).toEqual([]); // does not know her name
    igl.useAbility("reportSubject");
    await wait(200);
    expect(world.load("campaign_dev").cases.case_001?.outcome).toBe("subject_reported");
    await Promise.all([igl.leave(), other.leave()]);
  });
});

describe("NPC death", () => {
  it("the watcher dies if the team is too slow; the body can be examined and stays dead", async () => {
    const port = 2615;
    const world = new InMemoryWorldRepository();
    const smoker = CASE_001_WITNESSES.find((w) => w.key === "witness_smoker");
    if (!smoker) throw new Error("no smoker");
    // 1000x case time: relocation at 0.9 s, the watcher dies 0.3 s later.
    servers.push(await startGameServer(port, { world, people: [{ ...smoker, standAt: { x: 0, z: 6 } }], caseTimeScale: 1000, rng: () => 0 }));
    const { igl, other, room } = await team(port);
    const bodyId = [...room.state.npcs.keys()][0] ?? "";
    for (let i = 0; i < 40 && !room.state.npcs.get(bodyId)?.down; i++) await wait(100);
    expect(room.state.npcs.get(bodyId)?.down).toBe(true);
    other.talk(bodyId);
    await wait(150);
    expect(other.dialogue?.line).toContain("doesn't move");
    other.choose("search");
    await wait(150);
    expect(other.evidence.map((e) => e.item.id)).toEqual(["case001.ev.smokerBody"]);
    await Promise.all([igl.leave(), other.leave()]);
    await wait(300);
    expect(world.load("campaign_dev").people.witness_smoker).toBe("dead");

    const late = new Bot({ endpoint: `ws://localhost:${port}` });
    const room2 = await late.join();
    await wait(200);
    expect(room2.state.npcs.size).toBe(0);
    await late.leave();
  }, 20000);
});
