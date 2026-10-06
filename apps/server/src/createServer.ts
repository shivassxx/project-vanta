import { createServer } from "node:http";
import { Server } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { GAME_ROOM_NAME } from "@vanta/shared";
import { InMemoryCharacterRepository } from "./persistence/CharacterRepository";
import { GameRoom, type GameRoomOptions } from "./rooms/GameRoom";
import { CharacterService } from "./systems/characters";

/** Single development campaign until campaign selection exists. */
export const DEV_CAMPAIGN_ID = "campaign_dev";

export async function startGameServer(
  port: number,
  characters = new CharacterService(new InMemoryCharacterRepository(), DEV_CAMPAIGN_ID),
): Promise<Server> {
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
  const roomOptions: GameRoomOptions = { characters };
  gameServer.define(GAME_ROOM_NAME, GameRoom, roomOptions);
  await gameServer.listen(port);
  return gameServer;
}
