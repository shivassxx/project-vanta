import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { DEFAULT_SERVER_PORT } from "../../packages/shared/src/index";

/** Path under which the client reaches the game server through this same port. */
const GAME_PATH = "/colyseus";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Listen on all interfaces so other machines (LAN / port-forward / tunnel) can join.
    host: true,
    // Allow tunnel hostnames; this is a dev server for private playtests only.
    allowedHosts: true,
    // One public port: game traffic (HTTP matchmaking + WebSocket) is proxied to the server.
    proxy: {
      [GAME_PATH]: {
        target: `http://localhost:${DEFAULT_SERVER_PORT}`,
        ws: true,
        rewrite: (path) => path.slice(GAME_PATH.length) || "/",
      },
    },
  },
});
