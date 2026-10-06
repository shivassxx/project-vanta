import type { Server } from "@colyseus/core";
import { Bot } from "@vanta/bots";
import { CASE_001_SUBJECT, CASE_001_WITNESSES } from "@vanta/content/server";
import { afterAll, describe, expect, it } from "vitest";
import { startGameServer } from "./createServer";
import { InMemoryWorldRepository } from "./persistence/WorldRepository";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
let server: Server | undefined;
afterAll(async () => {
  await server?.gracefullyShutdown(false);
});

const barista = CASE_001_WITNESSES.find((w) => w.key === "witness_barista");
if (!barista) throw new Error("no barista");
const findNpc = (b: Bot, look: { jacket: string; hair: string }) =>
  [...(b.room?.state.npcs.entries() ?? [])].find(([, n]) => n.jacket === look.jacket && n.hair === look.hair);

/**
 * CASE_001 played end to end on the real greybox layout (real spawns, real people, real evidence),
 * by two headless players. Only time is sped up (case x10: the run takes a few case minutes, well
 * inside the 15-minute delay consequence). This is the vertical slice's regression test.
 */
describe("CASE_001 walkthrough", () => {
  it("signal -> share -> evidence -> witness -> CCTV -> board -> warn the Subject -> outcome, police and memory", async () => {
    const world = new InMemoryWorldRepository();
    server = await startGameServer(2620, { world, caseTimeScale: 10, npcTimeScale: 2, rng: () => 0 });
    const endpoint = "ws://localhost:2620";
    const igl = new Bot({ endpoint });
    const room = await igl.join();
    const scout = new Bot({ endpoint, roomId: room.roomId });
    await scout.join();
    for (let i = 0; i < 50 && igl.knowledge.length < 4; i++) await wait(100); // first signal: 4 case seconds

    // 1. VANTA designates the IGL and sends the Subject; the IGL shares photo and name with the scout only.
    expect(igl.isIgl()).toBe(true);
    expect(igl.knowledge).toHaveLength(4);
    expect(scout.knowledge).toEqual([]);
    igl.share("case001.subject.photo", [scout.characterId]);
    igl.share("case001.subject.fullName", [scout.characterId]);
    await wait(200);
    expect(scout.knowledge.map((k) => k.item.id).sort()).toEqual(["case001.subject.fullName", "case001.subject.photo"]);

    // 2. The scout walks to the café and picks up the receipt.
    await scout.walkTo({ x: 10, z: 10 });
    scout.interact("spot_cafe_table");
    await wait(200);
    expect(scout.evidence.map((e) => e.item.id)).toEqual(["case001.ev.cafeReceipt"]);

    // 3. Honest witness: show the photo, then the receipt.
    const baristaNpc = findNpc(scout, barista.look);
    if (!baristaNpc) throw new Error("barista not in the world");
    scout.talk(baristaNpc[0]);
    await wait(150);
    scout.choose("photo");
    await wait(150);
    scout.choose("receipt2");
    await wait(150);
    scout.choose("thanks");
    await wait(150);
    expect(scout.evidence.map((e) => e.item.id)).toEqual(
      expect.arrayContaining(["case001.ev.baristaStatement", "case001.ev.baristaReceipt"]),
    );

    // 4. Physical DVR access behind the café (a crime the barista can see).
    await scout.walkTo({ x: 10.5, z: 5 });
    scout.interact("spot_cafe_backdoor");
    await wait(150);
    scout.choose("break");
    await wait(150);
    scout.choose("watch");
    await wait(150);
    expect(scout.evidence.map((e) => e.item.id)).toContain("case001.ev.cafeCctv");

    // 5. The team builds its own theory on the shared board.
    scout.boardCommand({ type: "pinEvidence", evidenceId: "case001.ev.cafeCctv" });
    scout.boardCommand({ type: "pinEvidence", evidenceId: "case001.ev.cafeReceipt" });
    igl.boardCommand({ type: "addNote", title: "Who is the watcher?", text: "black jacket, grey hair" });
    await wait(200);
    const [cctv, , note] = igl.board.entries;
    if (!cctv || !note) throw new Error("board not synced");
    igl.boardCommand({ type: "link", from: cctv.id, to: note.id, label: "same man?" });
    await wait(150);
    expect(scout.board.links).toHaveLength(1);

    // 6. Wait for the Subject to reach the café on her own schedule, then walk up and warn her.
    let subject = findNpc(scout, CASE_001_SUBJECT.look);
    for (let i = 0; i < 150; i++) {
      subject = findNpc(scout, CASE_001_SUBJECT.look);
      if (subject && Math.hypot(subject[1].x - 9, subject[1].z - 9) < 0.5) break;
      await wait(100);
    }
    if (!subject) throw new Error("Subject not in the world");
    expect(Math.hypot(subject[1].x - 9, subject[1].z - 9)).toBeLessThan(0.5);
    await scout.walkTo({ x: 9.6, z: 7.6 });
    scout.talk(subject[0]);
    await wait(150);
    expect(scout.dialogue?.options.map((o) => o.id)).toContain("warn");
    scout.choose("warn");
    await wait(300);

    // 7. Consequences: the case closes, VANTA tells only the IGL, the police call the scout, the world remembers.
    expect(igl.received.some((m) => m.type === "vantaNotice")).toBe(true);
    expect(scout.received.some((m) => m.type === "vantaNotice")).toBe(false);
    for (let i = 0; i < 150 && scout.phone.length === 0; i++) await wait(100); // police notice: 90 case seconds
    expect(scout.phone.map((m) => m.from)).toEqual(["Calder PD, Det. Okafor"]);
    expect(igl.phone).toEqual([]);
    const saved = world.load("campaign_dev").cases.case_001;
    expect(saved?.outcome).toBe("subject_warned");
    expect(saved?.flags).toMatchObject({ cafeDvrAccessed: true });
    expect(saved?.counters).toMatchObject({ crimes: 1, witnessedCrimes: 1 });
    await Promise.all([igl.leave(), scout.leave()]);
  }, 60000);
});
