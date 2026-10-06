import { DEFAULT_SERVER_PORT } from "@vanta/shared";
import { startGameServer } from "./createServer";

const port = Number(process.env.PORT ?? DEFAULT_SERVER_PORT);
await startGameServer(port);
console.log(`[Multiplayer] server listening on :${port}`);
