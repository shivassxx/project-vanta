# Architecture

See `CLAUDE.md` section 3 for the stack and rules. Decisions made so far:

- pnpm workspaces monorepo: `apps/client`, `apps/server`, `packages/*` (`@vanta/*`).
- Workspace packages export TypeScript source directly (`main: src/index.ts`); no build step between packages.
- TypeScript strict, shared `tsconfig.base.json` (`noUncheckedIndexedAccess` on).
- Server: Colyseus 0.16 (`@colyseus/core`, `ws-transport`, `schema` 3). Plain HTTP `/health` endpoint shares the port with the WebSocket transport.
- Client: Vite + Three.js. React overlay arrives with the first UI milestone.
- Tests: Vitest from the repo root (`pnpm test`), files at `{apps,packages}/*/src/**/*.test.ts`.
- Dev: `pnpm dev` runs server (:2567) and client (:5173) together.
