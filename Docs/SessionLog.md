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

## 2026-10-06 — M3 Characters
- `@vanta/content`: 13 profession definitions (access + restriction, not RPG stats).
- Server: `CharacterService` + `CharacterRepository` interface (in-memory impl). A client-held secret `playerToken` (localStorage) maps to a persistent `char_<hex>` ID registered in `campaign_dev`; profession is rolled once at creation.
- Information filtering: public schema holds only `characterId`; the profession goes out as a per-client `privateProfile` message, sent on the owner's request (also after reconnect). Joins without a valid token are rejected; a second live session of the same character is rejected; a fresh join replaces a disconnected stale session.
- Client: private background panel (top right).
- Tests (23 passing): profession roll mapping, one character per token, profile shape, token validation, owner-only delivery, no profession in public state, same token -> same character, duplicate session rejected, profile re-sent after reconnect. Verified in headless Chromium.
- Known gaps: characters are lost on server restart (SQLite persistence is M9); no appearance customization or pre-existing relationships yet (Backlog).
- Next: M4 VANTA + IGL.

## 2026-10-06 — M4 VANTA + IGL
- `IglSystem` (pure): designates an IGL once 2+ characters are connected (random; criteria never sent). IGL disconnect -> temporary IGL; original returns -> VANTA restores or keeps the replacement (50/50 for now); permanent removal -> new IGL.
- `KnowledgeStore` + `checkShare`: per-character knowledge on the server; each client only receives its own list (`knowledge` message). Only the current IGL can share, only items it knows, only to characters in the room.
- VANTA delivers the CASE_001 Subject signal (name, Citizen ID, photo placeholder, approximate location) to the IGL a few seconds after designation. A new IGL inherits the already-delivered signal (decision: otherwise a dropped IGL would stall the case).
- Public state: `iglCharacterId` only (who, never why).
- Client: React overlay (private background panel, IGL share panel with per-teammate checkboxes, "received" list with sender). Bot IGLs share everything with everyone so solo playtests with bots work.
- Tests (36 passing): IGL state machine (6), knowledge/share validation (3), integration: signal reaches only the IGL and no Subject value appears in others' traffic, share reaches only selected teammates, non-IGL share ignored, temporary IGL inherits signal and original IGL restored on return.
- Verified in headless Chromium with two human tabs.
- Known gaps: knowledge is in memory (M9); non-IGL players cannot forward info yet (phone, M7); signal content is fixed CASE_001 data (case engine, M6).
- Next: M5 Subject.

## 2026-10-06 — Exposing the game for remote playtests
- Vite dev server listens on all interfaces (`host: true`, `allowedHosts: true`) and proxies `/colyseus` (HTTP + WebSocket) to the game server. The client connects to its own origin, so one public port (5173) is enough; works behind port forwarding or a tunnel.
- Verified: page, matchmaking and WebSocket game traffic over the machine's network IP (bots + two Chromium players, IGL share). In the cloud sandbox the browser had to bypass the sandbox HTTP proxy, which rejects WebSocket upgrades; not relevant on a normal network.

## 2026-10-06 — M5 Subject
- World people: Subject (Elena Marsh Varga) + 3 civilians, all `NpcState` entries with opaque IDs and identical public fields (position, facing, appearance). Which one is the Subject, the plan and the suspicion stay server-side (`NpcWorld`); the Subject's plan lives in `@vanta/content/server` so it never reaches the client bundle (verified by grepping the client build).
- Schedule: `Brain` dwells at plan stops and walks the ring road between them (`ring.ts`; real navmesh arrives with the city). Plan is CASE_001 content data.
- Identification: photo item draws the Subject's face (skin, hair, face shape); in the world players can "Observe person" (E) and get an observation text of the same traits plus clothing/build. A civilian shares hair/skin traits with the Subject so a glance is not enough. No verdict is ever shown.
- Surveillance: `Awareness` raises hidden suspicion for observers who are close, in the Subject's field of view, sprinting, or tailing for a long time; it decays when left alone. Over the threshold the Subject glances at the observer, hurries to the far side of the ring, skips the next planned stop (visible route change) and then resumes the plan. Emits `subject.noticed/arrived/departed` events (hook for the case engine, M6).
- Tests (57 passing): ring paths, awareness rules (7), brain schedule + evade (4), NpcWorld (4), observe text, appearance, integration: 4 people synced with identical field sets and no leaked secrets, Subject walks to the coffee shop on schedule.
- Known gaps: Subject cannot yet leave the district, call police or switch vehicle (M8); evading is a single reaction; no collision between NPCs and players; observe text is only shown in the status line.
- Next: M6 case engine.
