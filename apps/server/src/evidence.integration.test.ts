import type { Server } from "@colyseus/core";
import { Bot } from "@vanta/bots";
import type { EvidenceSpotDef } from "@vanta/content/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startGameServer } from "./createServer";

const PORT = 2606;
const endpoint = `ws://localhost:${PORT}`;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Spawns are (0,8) for the first player and (2,8) for the second.
const spot: EvidenceSpotDef = {
  spotId: "spot_test",
  label: "Crumpled paper",
  position: { x: -1.5, z: 7 },
  pickUp: true,
  item: { id: "ev.test", kind: "document", title: "Test note", description: "SECRET-CONTENTS-123" },
};

let server: Server;
beforeAll(async () => {
  server = await startGameServer(PORT, { evidenceSpots: [spot] });
});
afterAll(async () => {
  await server.gracefullyShutdown(false);
});

describe("evidence and case board", () => {
  it("lets only a nearby player pick up evidence and keeps it private until pinned", async () => {
    const near = new Bot({ endpoint });
    const room = await near.join();
    const far = new Bot({ endpoint, roomId: room.roomId });
    await far.join();
    await wait(200);
    expect(room.state.spots.get("spot_test")?.label).toBe("Crumpled paper");

    far.interact("spot_test"); // ~3.6 m away: rejected by the server
    await wait(150);
    expect(far.evidence).toEqual([]);
    expect(room.state.spots.has("spot_test")).toBe(true);

    near.interact("spot_test");
    await wait(200);
    expect(near.evidence.map((e) => e.item.id)).toEqual(["ev.test"]);
    expect(room.state.spots.has("spot_test")).toBe(false); // picked up for everyone
    expect(JSON.stringify(far.received)).not.toContain("SECRET-CONTENTS-123");

    // Pinning is the player's choice; then the whole team sees it.
    far.boardCommand({ type: "pinEvidence", evidenceId: "ev.test" }); // does not hold it
    await wait(150);
    expect(far.board.entries).toEqual([]);
    near.boardCommand({ type: "pinEvidence", evidenceId: "ev.test" });
    await wait(150);
    expect(far.board.entries.map((e) => e.text)).toEqual(["SECRET-CONTENTS-123"]);

    // Anyone can add notes and draw links; the game never judges them.
    far.boardCommand({ type: "addNote", title: "Who wrote this?", text: "" });
    await wait(150);
    const [pinned, note] = near.board.entries;
    if (!pinned || !note) throw new Error("board not synced");
    near.boardCommand({ type: "link", from: pinned.id, to: note.id, label: "handwriting?" });
    await wait(150);
    expect(far.board.links).toEqual([expect.objectContaining({ from: pinned.id, to: note.id, label: "handwriting?" })]);
    await near.leave();
    await far.leave();
  });
});
