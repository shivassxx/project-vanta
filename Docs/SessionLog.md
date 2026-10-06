# Session Log

## 2026-10-06 — M0 Foundation
- Created pnpm monorepo (apps/client, apps/server, packages/shared, case-engine, content, bots).
- Strict TS, ESLint, Vitest, Vite + Three.js greybox page, Colyseus server with `LobbyRoom` and `/health`.
- Verified: typecheck, lint, test, client build, `pnpm dev` serves both (:5173, :2567).
- Next: M1 third-person core.

## 2026-10-06 — M1 Third-person core
- Added `ActionMap` (raw input -> actions), kinematic circle-vs-box movement with sub-stepping (fixes tunneling through thin walls), camera rig with explore/shoulder/investigate presets, reusable interactable lookup (range + facing cone), greybox yard with capsule player.
- Tests: action map, movement/collision, camera-relative direction, interaction selection (10 total passing). Verified in headless Chromium: movement, wall collision, camera.
- Not done: gamepad, pointer-lock UX polish, interaction effects (only a status message), camera wall collision.
- Next: M2 multiplayer.

## 2026-10-06 — M2 Multiplayer
- Moved movement + greybox collision data to `@vanta/shared` so client prediction and server simulation share one implementation.
- `GameRoom`: clients send only input intent (axis, yaw, sprint, seq); server sanitizes it, simulates at 20 Hz, owns positions. Max 6 players. Non-consented leave keeps the slot for 20 s (`allowReconnection`).
- Client: joinOrCreate, or join by URL hash (invite link); reconnects with a sessionStorage token after reload; local prediction with soft reconciliation; remote capsules interpolated, translucent while disconnected.
- `@vanta/bots`: headless `Bot` (colyseus.js) + `pnpm bots [count] [roomId]` runner.
- Schemas use `declare` + `defineTypes` instead of decorators: tsx compiled shared decorators as TC39 decorators and crashed the server.
- Vitest uses the `threads` pool: Colyseus misreads forked workers' `process.send` as a PM2 channel.
- Tests (15 passing): input sanitizing, 2-player sync, speed cap vs. cheating input, 6-player cap, drop + reconnect keeps the same session. Verified in headless Chromium: browser player + 2 bots + second tab via invite link in one room.
- Known gaps: camera clips through walls, no input-replay reconciliation, no gamepad.
- Next: M3 characters.
