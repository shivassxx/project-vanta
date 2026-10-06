import { createServer } from "node:http";
import { Server } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { GAME_ROOM_NAME } from "@vanta/shared";
import { GameRoom } from "./rooms/GameRoom";

export async function startGameServer(port: number): Promise<Server> {
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
  gameServer.define(GAME_ROOM_NAME, GameRoom);
  await gameServer.listen(port);
  return gameServer;
}
