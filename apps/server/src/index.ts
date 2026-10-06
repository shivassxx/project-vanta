import { DEFAULT_SERVER_PORT } from "@vanta/shared";
import { sqliteOptions, startGameServer } from "./createServer";
import { SqliteStore } from "./persistence/sqlite";

const port = Number(process.env.PORT ?? DEFAULT_SERVER_PORT);
const dbPath = process.env.VANTA_DB ?? "saves/vanta.sqlite";
const store = new SqliteStore(dbPath);
await startGameServer(port, sqliteOptions(store));
console.log(`[Saves] using ${dbPath}`);
console.log(`[Multiplayer] server listening on :${port}`);
