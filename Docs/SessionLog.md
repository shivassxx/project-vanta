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
