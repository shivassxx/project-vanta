# Roadmap

- [x] M0 Foundation — monorepo, strict TS, lint, Vitest, client + server via `pnpm dev`, Docs
- [x] M1 Third-person core — action-map input, kinematic movement + box colliders, 3 camera modes, interaction framework, capsule in greybox
- [x] M2 Multiplayer — create/join (invite link), 2–6 synced players, server-authoritative movement, 20 s reconnect window, headless bots
- [x] M3 Characters — persistent character IDs (per player token), random private professions, campaign registration (in-memory until M9), private profile sent only to its owner
- [x] M4 VANTA + IGL — opaque IGL designation, one-way Subject signal to IGL only, per-item per-teammate share UI (React), temporary IGL on disconnect with re-evaluation on return
- [x] M5 Subject — Subject + 3 civilians in the world, server-side schedule, identification by face/clothing (no markers), follow, noticing obvious surveillance + route change
- [x] M6 Case engine — pure data-driven events → conditions → actions engine with timers, stages, outcomes, validation; CASE_001 rules as data drive the VANTA signal, Subject pressure and the delay consequence
- [x] M7 Investigation — physical evidence, shared case board, conversations (honest + deceptive witness), vehicle clue with background paths, phone camera photos, CCTV via employee or DVR access
- [x] M8 Consequences — Subject escape, NPC death (persistent), witnessed-crime police contact, persistent world state, CASE_001 outcomes: subject_fled, case_cold, subject_warned, subject_reported
- [x] M9 Save/Load — SQLite (better-sqlite3): separate campaign/world and character saves, versioned JSON with migrations, round-trip and server-restart tests
- [ ] M10 Vertical slice (CASE_001) — slice 1 done (tuning, collisions, dev tools, end-to-end walkthrough test); needs human playtests
