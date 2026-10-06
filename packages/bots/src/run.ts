import { DEFAULT_SERVER_PORT, MAX_PLAYERS } from "@vanta/shared";
import { Bot } from "./bot";

// Usage: pnpm bots [count] [roomId]  — fills a room with wandering test players.
const count = Math.min(Number(process.argv[2] ?? 1), MAX_PLAYERS - 1);
const roomId = process.argv[3];
const endpoint = `ws://localhost:${DEFAULT_SERVER_PORT}`;

for (let i = 0; i < count; i++) {
  const bot = new Bot({ endpoint, roomId });
  const room = await bot.join();
  console.log(`[Multiplayer] bot ${bot.sessionId} joined ${room.roomId}`);
  let yaw = Math.random() * Math.PI * 2;
  setInterval(() => {
    if (Math.random() < 0.05) yaw = Math.random() * Math.PI * 2;
    bot.sendInput({ x: 0, y: 1, yaw });
  }, 50);
}
