import { createServer } from "node:http";
import { Server } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { GAME_ROOM_NAME } from "@vanta/shared";
import { InMemoryCharacterRepository } from "./persistence/CharacterRepository";
import { GameRoom, type GameRoomOptions } from "./rooms/GameRoom";
import { CharacterService } from "./systems/characters";
import { EvidenceStore } from "./systems/evidence";
import { KnowledgeStore } from "./systems/knowledge";

/** Single development campaign until campaign selection exists. */
export const DEV_CAMPAIGN_ID = "campaign_dev";

export async function startGameServer(port: number, overrides: Partial<GameRoomOptions> = {}): Promise<Server> {
  const roomOptions: GameRoomOptions = {
    characters: new CharacterService(new InMemoryCharacterRepository(), DEV_CAMPAIGN_ID),
    knowledge: new KnowledgeStore(),
    evidence: new EvidenceStore(),
    ...overrides,
  };
  const httpServer = createServer((req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    if (req.url === "/health") {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: true }));
      return;
    }
    res.statusCode = 404;
    res.end();
  });
  const gameServer = new Server({ transport: new WebSocketTransport({ server: httpServer }) });
  gameServer.define(GAME_ROOM_NAME, GameRoom, roomOptions);
  await gameServer.listen(port);
  return gameServer;
}
