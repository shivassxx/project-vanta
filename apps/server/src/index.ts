import { createServer } from "node:http";
import { Server } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { DEFAULT_SERVER_PORT, LOBBY_ROOM_NAME } from "@vanta/shared";
import { LobbyRoom } from "./rooms/LobbyRoom";

const port = Number(process.env.PORT ?? DEFAULT_SERVER_PORT);

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
gameServer.define(LOBBY_ROOM_NAME, LobbyRoom);

await gameServer.listen(port);
console.log(`[Multiplayer] server listening on :${port}`);
