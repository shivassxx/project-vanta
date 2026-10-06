# Architecture

See `CLAUDE.md` section 3 for the stack and rules. Decisions made so far:

- pnpm workspaces monorepo: `apps/client`, `apps/server`, `packages/*` (`@vanta/*`).
- Workspace packages export TypeScript source directly (`main: src/index.ts`); no build step between packages.
- TypeScript strict, shared `tsconfig.base.json` (`noUncheckedIndexedAccess` on).
- Server: Colyseus 0.16 (`@colyseus/core`, `ws-transport`, `schema` 3). Plain HTTP `/health` endpoint shares the port with the WebSocket transport.
- Network schemas live in `@vanta/shared/network.ts`, written with `declare` fields + `defineTypes` (no decorators) so tsc, Vite and tsx agree.
- Movement is server-authoritative: clients send input intent only; the server runs the same `moveWithCollision` used for client prediction. Positions are public; secrets must never go into schema state (per-client messages instead).
- Test players live in `@vanta/bots`, separate from NPC simulation.
- Client: Vite + Three.js. React overlay arrives with the first UI milestone.
- Tests: Vitest from the repo root (`pnpm test`), files at `{apps,packages}/*/src/**/*.test.ts`.
- Dev: `pnpm dev` runs server (:2567) and client (:5173) together.
- Identity: a client-held secret `playerToken` maps to a stable `characterId`. The token is never broadcast or logged. Private character data (profession) is only sent via per-client messages.
- Persistence goes through repository interfaces in `apps/server/src/persistence/` (in-memory now, SQLite in M9).
- Secret game knowledge (Subject info, shared items) lives in the server `KnowledgeStore`, keyed by character, and reaches a client only as that character's own `knowledge` list. Public schema state only says who the IGL is.
- Client UI overlays are React (`apps/client/src/ui`), fed by a small `SessionStore` (useSyncExternalStore); the Three.js loop stays outside React.
- Network entry: in dev, the client reaches the game server through the Vite proxy at `/colyseus` on the page's own origin (single public port 5173). A production deployment will do the same through Caddy.
