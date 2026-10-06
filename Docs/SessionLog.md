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

## 2026-10-06 — M6 Case engine
- `@vanta/case-engine` (pure, no I/O): `CaseDef` = rules `{ on, when, do, once }`; conditions (flag, counter, stage, payload, all/any/not); actions (setFlag, increment, setStage, start/cancelTimer, setOutcome, effect). `dispatch()` is pure, fires due timers first, cascades `stage:<name>` / `timer:<id>` events with a loop guard, stops after an outcome. State is plain JSON with stable IDs (ready for M9 saves). `validateCaseDef()` checks duplicate IDs, unknown stages, never-started timers, empty rules.
- CASE_001 rules (`@vanta/content/server`): designation -> 4 s -> first VANTA signal (stage `locate`); first notice -> `wary`, second -> `spooked` (+ `subject.alert` effects); park meeting flag from the Subject's schedule note; after 15 min without progress -> `relocated` + VANTA sends an updated location (delay consequence + location change).
- Server: `CaseRunner` keeps case time, feeds `igl.designated`, `subject.*`, `info.shared`, applies `vanta.deliver` effects (IGL only; a new IGL inherits delivered items). The hardcoded signal timer is gone.
- Tests (78 passing): engine (12), CASE_001 content (6), end-to-end delay consequence reaching only the IGL; existing IGL tests now run through the engine.
- Known gaps: `subject.alert` and outcomes are only logged (M8); no player-action events yet (evidence/conversations arrive in M7); no outcomes in CASE_001 yet.
- Next: M7 investigation.

## 2026-10-06 — M7 slice 1: evidence + shared case board
- Evidence spots (`SpotState`: id, position, visible label) are public; contents stay server-side (`@vanta/content/server` CASE_001_EVIDENCE: café receipt, torn note, parking stub with a plate). `MSG_INTERACT` is validated against the server-side player position; picked-up evidence disappears for everyone and goes only to the finder (`EvidenceStore`). Case engine gets `evidence.found`.
- Case board (per room/team): pure `applyBoardCommand` reducer — pin evidence/info you hold, add notes, link entries with your own label, remove only what you added. Broadcast to the team; case engine gets `board.pinned` / `board.note` / `board.linked`. No truth/authenticity anywhere.
- Client: placeholder paper objects, "Examine" prompt, evidence list, board panel (B) with pin/note/link UI; keyboard input is ignored while typing in overlay fields. Removed the M1 placeholder crate interactions.
- Tests (87 passing): board reducer (5), evidence world/store (3), integration: far player cannot pick up, contents never reach others until pinned, pinning shares with team, notes and links sync. Verified in Chromium: walk to the receipt, pick up, pin, note visible on the second player's board.
- Remaining M7: phone camera photos, conversations (honest/deceptive witness), CCTV path, vehicle record lookup.

## 2026-10-06 — M7 slice 2: conversations
- Authored conversations as data (`@vanta/content/server` conversations): nodes with lines and options; options can require held evidence, known info (e.g. the Subject photo) or the player's private background. `validateConversation` checks links, testimony IDs and that every node has an unconditional option.
- CASE_001: honest witness (barista, near the café: Elena came with an older man in a grey coat; with the receipt: the card is his) and deceptive witness (smoker near the park: sends players after a red car going north, denies the bench meeting; police/PI/ex-intelligence backgrounds can press him and he gets nervous). Generic civilians brush players off; the Subject asks "Do I know you?" and notices the player immediately.
- Anyone can be talked to (E), so the UI does not reveal who matters. The server checks distance, evaluates requirements and sends only the options this player can use; forged option IDs are ignored. Testimony is granted as evidence (kind `testimony`) and can be pinned. Case engine gets `conversation.started`, `conversation.choice`, `evidence.found`.
- Client: dialogue panel (mouse or keys 1-4, walk away to end).
- Tests (96 passing): conversation gating/tree (4), content validation (3), witnesses stay put, Subject notices a talker, integration: hidden option not shown and forged choice ignored, IGL with photo gets testimony that never reaches the other player, talking to the Subject is noticed, out-of-range talk refused. Verified in Chromium: walk to the barista, show photo, statement added to evidence.
- Remaining M7: phone camera photos, CCTV path, vehicle record lookup.

## 2026-10-06 — M7 slice 3: vehicle clue
- `VehicleState` (id, position, heading, color) is public; model, plate and owner are server-only (`CASE_001_VEHICLES`). The grey sedan CAL-7Q34 stands by the office lot.
- Examining a vehicle reuses the conversation system: look through the window (observation evidence: permit, grey coat on the back seat, child's drawing) or force the door (crime; registration from the glovebox).
- Background abilities (`CASE_001_ABILITIES`, computed per player on the server and sent privately): police officer runs the plate instantly (case event `police.plateLookup` -> access-log flag); private investigator files a DMV request that arrives after 60 case seconds. Both require holding something with the plate on it; each can be used once.
- Registration: Raymond Yates (R.Y. on the café receipt; grey coat matches the barista's statement). Nothing states what that means.
- CASE_001 rules record `sedanBrokenInto` + `crimes`, `policeLookupLogged`, `dmvRequestFiled` for M8 police consequences.
- Tests (103 passing): ability availability (3), vehicle trace rules (2), integration: plate never in public state, police instant lookup, PI delayed result, forged ability ignored, forced door path; bots now walk with server-validated movement (`Bot.walkTo`). Verified in Chromium.
- Known gaps: vehicles have no collision and cannot be driven yet; vehicle colliders should join the shared collision list.
- Remaining M7: phone camera photos, CCTV path.

## 2026-10-06 — M7 slice 4: phone camera + CCTV (M7 complete)
- Phone camera (P): the client sends only its camera yaw; the server decides what is in frame from authoritative positions (±25° FOV, 22 m range, walls occlude, faces/plates readable within 8 m) and creates a `photo` evidence item captioned with the case clock (starts 08:00) and the nearest named area (`GREYBOX_AREAS`). Photos never name anyone. Cooldown 1.5 s, max 40 per character. The client keeps a local-only thumbnail. Case engine gets `photo.taken {subjectInFrame, area}`; CASE_001 flags a photographed park meeting.
- CCTV, only through believable routes: police/security/PI can ask the barista for the footage; anyone can force the café's service door to the DVR (crime), and an IT background sees a quieter maintenance-port route (also a crime). Interactive spots reuse the conversation system. The footage shows the envelope handover and the grey-haired man in a black jacket watching from across the street — the deceptive witness.
- CASE_001 rules: `cafeDvrAccessed` + crimes, `baristaShowedCctv`, `parkMeetingPhotographed`.
- Tests (110 passing): camera framing/occlusion/detail/caption (6), integration: photo only to the photographer with cooldown, CCTV by asking (security background), DVR forced (doctor; IT option hidden). Verified in Chromium: photo with thumbnail and server description.
- Next: M8 consequences.

## 2026-10-06 — M8 slice 1: consequences
- Case engine: effect payload strings `$event.<key>` are filled from the triggering event (e.g. who committed a crime).
- Crimes are data (`crime` on a conversation option). The server checks whether any person can see the spot (range 9 m, walls block) and feeds `crime.committed {actor, kind, witnessed}`. CASE_001: every crime counted; a witnessed one -> `police.notice` -> 90 case seconds later Det. Okafor (Calder PD) leaves a message on that player's phone only. The message never confirms what the police know.
- Subject escape: `subject.alert spooked` makes the Subject hurry to the nearest exit and leave the district; `subject.leftDistrict` closes CASE_001 as `subject_fled`. Too slow after the relocation (+10 min) closes it as `case_cold`. On an outcome the IGL alone gets VANTA's "SIGNAL CLOSED."
- Persistent world state (`WorldRepository`, versioned, in-memory until M9): case state, items VANTA delivered, people gone/dead, police attention, phone inboxes. A new room in the same campaign resumes the case and does not respawn a Subject who left.
- Fix: the Subject's "noticed" event was emitted before its evade move, so a case reaction (leave) got overwritten; now emitted last.
- Client: private PHONE panel, VANTA notice banner for the IGL.
- Tests (123 passing): templating, crime/witness/outcome rules, world repository (version check, isolation), Subject leaving + not respawning, witnesses with line of sight, integration: police contact only the seen player, unseen crime stays quiet, spooked Subject leaves -> outcome -> IGL-only notice -> next room remembers.
- Remaining M8: NPC death, intervention outcomes (warn / report the Subject).
