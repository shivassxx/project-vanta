import type { Server } from "@colyseus/core";
import { Bot } from "@vanta/bots";
import { PROFESSIONS } from "@vanta/content";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startGameServer } from "./createServer";
import { InMemoryCharacterRepository } from "./persistence/CharacterRepository";
import { CharacterService } from "./systems/characters";

const PORT = 2608;
const endpoint = `ws://localhost:${PORT}`;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const REGISTRATION = "case001.ev.sedanRegistration";

// First character is a police officer, second a private investigator.
const order = ["police_officer", "private_investigator"].map((id) => PROFESSIONS.findIndex((p) => p.id === id));
let n = 0;
const rng = () => ((order[n++ % order.length] ?? 0) + 0.5) / PROFESSIONS.length;

let server: Server;
beforeAll(async () => {
  server = await startGameServer(PORT, {
    characters: new CharacterService(new InMemoryCharacterRepository(), "campaign_test", rng),
    caseTimeScale: 100,
    people: [],
  });
});
afterAll(async () => {
  await server.gracefullyShutdown(false);
});

describe("vehicle clue", () => {
  it("keeps the plate off public state and opens background-specific paths to the owner", async () => {
    const cop = new Bot({ endpoint });
    const room = await cop.join();
    const pi = new Bot({ endpoint, roomId: room.roomId });
    await pi.join();
    await wait(200);
    expect(cop.profile?.professionId).toBe("police_officer");
    expect(pi.profile?.professionId).toBe("private_investigator");
    const pub = JSON.stringify(room.state.toJSON());
    expect(pub).toContain("veh_sedan");
    for (const secret of ["CAL-7Q34", "Yates", "Avenir"]) expect(pub).not.toContain(secret);

    // Police: walk to the car, look through the window, run the plate (instant, logged).
    await cop.walkTo({ x: -9, z: -3.5 });
    cop.talk("veh_sedan");
    await wait(150);
    expect(cop.dialogue?.observed).toBe("grey Calder Motors Avenir sedan");
    cop.choose("window");
    await wait(150);
    expect(cop.abilities.map((a) => a.id)).toEqual(["runPlate"]);
    cop.useAbility("runPlate");
    await wait(150);
    expect(cop.evidence.map((e) => e.item.id)).toContain(REGISTRATION);
    expect(cop.abilities).toEqual([]);

    // Private investigator: same observation, licensed request arrives later.
    await pi.walkTo({ x: -9, z: -3.5 });
    pi.talk("veh_sedan");
    await wait(150);
    pi.choose("window");
    await wait(150);
    expect(pi.abilities.map((a) => a.id)).toEqual(["requestDmv"]);
    pi.useAbility("runPlate"); // not theirs: ignored
    pi.useAbility("requestDmv");
    await wait(100);
    expect(pi.evidence.map((e) => e.item.id)).not.toContain(REGISTRATION);
    await wait(700); // 60 case seconds at 100x
    expect(pi.evidence.map((e) => e.item.id)).toContain(REGISTRATION);
    await cop.leave();
    await pi.leave();
  }, 30000);

  it("lets anyone force the door instead", async () => {
    const a = new Bot({ endpoint });
    await a.join();
    await wait(150);
    await a.walkTo({ x: -9, z: -3.5 });
    a.talk("veh_sedan");
    await wait(150);
    a.choose("force");
    await wait(150);
    expect(a.dialogue?.line).toContain("registration papers");
    a.choose("take");
    await wait(150);
    expect(a.evidence.map((e) => e.item.id)).toEqual(["case001.ev.sedanObserved", REGISTRATION]);
    await a.leave();
  }, 30000);
});
