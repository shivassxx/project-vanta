# PROJECT VANTA — Agent Guide

You are the lead development agent for **PROJECT VANTA**, an original 3D third-person, 2–6 player cooperative investigation thriller that runs **in the browser**.

You inspect, design, implement, compile, test, debug and document the actual project. The project must stay runnable after every session. Never try to build the whole game in one pass.

> **Language rule:** Always talk to the user in **Turkish**: questions, progress updates, end-of-session reports and run instructions. Keep code, identifiers, comments, commit messages and `Docs/` files in English.

> **Budget rule:** Development runs on limited cloud-session credit. Every session does ONE milestone slice, keeps diffs small, avoids unnecessary dependencies, and ends with a short report. Do not explore, refactor or polish outside the current task.

---

## 1. The Game in One Paragraph

Players receive the identity of a person (a **Subject**) connected to imminent violence. They are not told whether the Subject is the victim, the perpetrator, an accomplice, or something more complicated. They must locate, observe, follow and investigate the Subject, form their own theory, and decide whether and how to intervene. The world remembers the consequences.

**Core loop:** VANTA signal → Subject info → locate → observe → follow → investigate → interview → collect evidence → connect information → form theory → intervene → consequence → world state changes.

**Pillars:** INVESTIGATE · OBSERVE · COORDINATE · DECIDE · LIVE WITH THE CONSEQUENCES. Every feature must strengthen at least one.

**Not:** GTA, an MMO, a life/police/military sim, a survival-crafting game, photorealistic AAA, or a big empty sandbox.

**Design test for every feature:** *Does this make investigating Subjects with friends significantly better?* If not → `Docs/Backlog.md`, not code.

---

## 2. Design Rules (Non-Negotiable)

### VANTA
- A powerful fictional surveillance/prediction system. Its unknown creator sold it to the government for **$1** after secretly building a backdoor. VANTA itself decides how to use that backdoor.
- Players are NOT operators: no control panel, no terminal, no CCTV access, no chatbot, no way to ask VANTA questions.
- Communication is **one-way**. VANTA decides who gets what, when, and what stays hidden. **VANTA usually knows more than it tells.**
- VANTA has **no face**: no avatar, hologram, assistant voice or friendly persona. Distant, deliberate, hard to understand.

### Subjects
- Subjects are dangerous, in danger, or directly connected to serious impending violence. The category is never told.
- Initial info: full name, fictional Citizen ID, face photo, approximate location (a street, several blocks, a neighborhood or a district).
- **No magic:** no marker over the Subject, no outlines, no floating names, no auto face-recognition, no permanent GPS, no detective vision.
- Players identify Subjects by face, clothing, vehicle, schedule, location, behavior and context.
- Multiple Subjects per case are rare; VANTA never explains their connection.

### IGL (In-Game Leader)
- VANTA chooses one IGL per team. No votes; the lobby owner is not automatically IGL; profession does not decide it; criteria are never explained.
- VANTA delivers new Subject info to the IGL, who **manually chooses what to share and with whom** (e.g. photo → everyone, Citizen ID → only the police-background player).
- The IGL is not a dictator; players can disagree, ignore the plan, investigate alone.
- IGL disconnects → VANTA picks a temporary IGL. Returns → VANTA re-evaluates (may restore or keep replacement). IGL permanently dies → VANTA picks another.

### Players
- 2–6 humans. Every core investigation must be playable with **two**. More players = more parallel leads, not an easier mission.
- Third-person camera with exploration framing, shoulder framing and an investigation zoom. Not isometric.
- Simple appearance customization only. No hair growth, aging, bruising, body change.
- **Random persistent background** at campaign start (police officer, doctor, journalist, ex-intelligence, paramedic, lawyer, security worker, mechanic, taxi driver, ex-soldier, IT worker, private investigator, ordinary civilian…). Not RPG classes: they give access, contacts, knowledge, restrictions, responsibilities, risks.
- Backgrounds are **private**; players may reveal, hide, partially reveal or lie.
- Characters may have pre-existing relationships (friends, colleagues, debt, conflict, shared incident) with asymmetric information.
- Private personal objectives create tension but this is **not a traitor game**.
- Death flow: injured → downed → team intervention → medical care → recovery. Permanent death only in severe cases; that character's history stays in the campaign and the player continues with a new one.
- A downed player cannot freely communicate; their phone stays physically on the body and can be taken.

### Phone
- A real but streamlined tool: calls, messages, camera, photos, notes, contacts, map, evidence sharing, location sharing.
- Fictional PIN/biometric lock. A captured phone exposes stored info.
- **No permanent teammate HUD markers.** Teammate location exists only via phone location sharing, and disappears if the phone is off, disconnected or sharing is disabled. The IGL has no radar.

### World
- Persistent open city, original fictional American-style metropolis. Dense, not huge. Long-term target 5–8 km².
- **Start with one small dense district.** Expand only after the investigation loop is proven fun.
- No teleporting between isolated mission arenas.
- Stylized-realistic look: atmospheric lighting, rain, fog, night readability, strong silhouettes, recognizable places.

### Investigation
- Evidence: photos, CCTV, phones, documents, vehicle records, messages, witnesses, digital records, physical objects, timelines.
- Evidence may be authentic, incomplete, misleading, manipulated, planted or misunderstood. **Never show truth/authenticity percentages.**
- The game provides information; players form conclusions. Never announce the correct theory.
- Shared **case board/notebook**: Subjects, NPCs, evidence, vehicles, phone numbers, photos, locations, notes, relationships; players draw their own links.
- CCTV is obtained only through believable gameplay (police access, security access, convincing an employee, physical DVR access).
- Hacking stays fictional and game-like: the gameplay is obtaining an entry point (credential, terminal, physical access, device, permission). **Never implement real offensive security procedures.**

### NPCs
- Important NPCs have hidden state: trust, fear, suspicion, stress, knowledge, relationships, goal, schedule, awareness of players.
- Important NPCs get believable routines; generic civilians get simplified ones.
- Simulation levels: far → abstract schedule on server; near → full simulated entity.
- NPCs can tell the truth, lie, omit, get suspicious, panic, refuse or change plans. Important conversations are authored.
- Future AI dialogue (optional, not in the initial game) must be constrained by the NPC's knowledge; an NPC never reveals what it cannot know.
- Experienced Subjects notice surveillance and react: change route, enter a building, cancel a meeting, call someone, switch vehicle, call police, counter-surveil.

### Police, Vehicles, Combat
- No wanted stars. Police consequences come from persistent evidence: witnesses, CCTV, plates, identity, access logs, physical and weapon evidence.
- Vehicles for travel, tailing, surveillance, escapes, team splitting. Useful data: model, color, plate, registered owner. No vehicle simulator.
- Combat exists but is secondary; no bullet sponges; violence has consequences.

### Cases and Failure
- Normal case: 45–90 minutes. Major investigations can span sessions.
- **Failure is content**, not "MISSION FAILED / RELOAD": Subject escapes or dies, witness disappears, evidence destroyed, wrong person accused, police identify a player, an organization grows suspicious. The campaign remembers.

### Long-Term Story (do not build yet)
- Authored main story; systems support it, procedural generation never replaces it.
- Players can eventually investigate VANTA itself ($1 sale, the backdoor, old employees, hidden facilities). Records may vanish without confirming VANTA did it.
- Reserve space for a competing system codenamed **MIRROR**. Do not build it in the vertical slice.

---

## 3. Technical Stack

| Area | Choice |
|---|---|
| Language | TypeScript (strict) everywhere |
| Repo | pnpm workspaces monorepo |
| 3D client | Three.js + Vite |
| UI overlays | React (phone, case board, IGL sharing screen, menus) rendered over the canvas |
| Multiplayer | Colyseus + @colyseus/schema, server-authoritative |
| Navigation | recast-navigation-js on the server |
| Physics | Start with simple kinematic movement + box colliders. Adopt Rapier only when a real need is proven. |
| Persistence | SQLite (better-sqlite3) behind a repository interface; PostgreSQL later if needed |
| Tests | Vitest; headless bot clients (colyseus.js in Node) for multiplayer tests |
| Assets | glTF/GLB |
| Deploy | Docker Compose + Caddy on a Linux VDS (later) |

Use current stable/LTS versions and pin them. Do not swap the networking framework or renderer without a documented strong reason in `Docs/Architecture.md`.

### Repository Layout

```
apps/
  client/          Vite + Three.js + React overlay
    src/
      engine/      renderer, camera, input, asset loading, world streaming
      game/        client-side presentation of game systems
      ui/          React: phone, case board, IGL panel, menus, debug
  server/          Colyseus rooms and authoritative simulation
    src/
      rooms/
      systems/     vanta, igl, subjects, npc, cases, evidence, police, save
      persistence/
packages/
  shared/          types, IDs, network schemas, constants
  case-engine/     pure TS event → condition → action engine (no I/O)
  content/         JSON/TS data: professions, cases, subjects, NPCs, evidence, items
  bots/            headless test-player clients
Docs/
  Architecture.md  Roadmap.md  Backlog.md  ThirdPartyAssets.md  SessionLog.md
assets/            source GLB/textures/audio + licenses
```

Keep files reasonably small with explicit names. Avoid circular dependencies between packages.

### Architecture Rules
- **Server owns** authoritative state: cases, Subjects, important NPCs, evidence, player status, IGL, campaign and world consequences. Never trust the client with persistent or important state.
- **Information asymmetry is enforced on the server.** A client only ever receives data its player is allowed to know (private background, IGL-only Subject info, unshared evidence). Never send hidden data and merely hide it in UI. Use per-client filtered messages rather than global schema state for secrets.
- **Definition vs runtime state:** content definitions in `packages/content` are immutable; runtime state lives in server state and saves.
- **Case engine** is data-driven: events (time, player action, NPC/Subject state, evidence, conversation, location, profession, previous outcome, faction) → conditions → actions. Never hardcode cases into giant scripts.
- **Interaction system** is reusable: talk, inspect, photograph, open, search, pick up, enter vehicle, use terminal.
- **Input** goes through an action map (keyboard/mouse first, controller-ready). No gameplay logic bound to raw keys.
- **Saves:** separate Campaign/World save from Player Character save. Stable string IDs only, never object references. Every save has a `version`; structural changes require a migration. Never silently corrupt saves.
- **Bots** (test players) are architecturally separate from civilian NPC simulation and can fill empty slots: 2 humans + bots … up to 6.
- **Logging:** structured, by category: VANTA, Multiplayer, Cases, Evidence, NPC, Saves, Streaming, Investigation. No spam.
- **Debug tools** (dev only, never required for normal play): choose IGL, trigger VANTA signal, spawn Subject, teleport, set time, inspect NPC state, grant evidence, advance case, kill NPC, down player, inspect world state, force save/load, simulate reconnect.

### Performance Budget
Players' machines do the rendering; the reference dev machine is **Ryzen 5 3600 / GTX 1050 Ti 4 GB / 16 GB RAM**. The client must run smoothly there at 1080p.
- Instancing for repeated props, LOD, frustum culling, shared materials, texture atlases.
- Textures 1K, 2K only where it matters. Compressed textures (KTX2) and Draco/meshopt geometry when assets grow.
- Few real-time shadow-casting lights; baked/fake lighting where possible.
- District-based streaming of world chunks; never load the whole city at full detail.
- Distant NPCs are abstract server data, not rendered entities.
- Measure (renderer.info, frame timings) before optimizing.

---

## 4. Assets

**Search first, build second** — but legality, technical fit, performance and visual consistency come before "free".

- Preferred sources: Kenney, Quaternius, Poly Haven, other clearly licensed CC0/permissive sources.
- Allowed licenses: CC0 or clearly documented commercial-use licenses. If the license is unclear, **do not use it**.
- Never use ripped, leaked, pirated or unclear-provenance assets.
- Record every asset in `Docs/ThirdPartyAssets.md`: name, creator, source URL, license, date, purpose, modifications, attribution requirements.
- If you cannot download an asset (network limits, login, manual license acceptance), do not bypass anything. Report it as:
  `ASSET RECOMMENDED / NAME / SOURCE / LICENSE / WHY IT FITS / WHAT THE USER NEEDS TO DO`
  and continue with a placeholder.
- **Missing art never blocks engineering.** Use boxes, capsules, mannequins and flat colors.
- Research assets only when the current milestone needs them.
- Unify mixed asset packs through shared materials, lighting, color grading and consistent scale.
- No copyrighted music.

---

## 5. Milestones

Do not start large-scale city work until CASE_001 is fun.

| # | Milestone | Done when |
|---|---|---|
| M0 | Foundation | Monorepo, strict TS, lint, Vitest, client and server run with one command, Docs files exist, `.gitignore` correct |
| M1 | Third-person core | Movement, camera modes, action-map input, interaction framework, placeholder character in a greybox block |
| M2 | Multiplayer | Create/join room, 2–6 synced players, server-validated movement, reconnect window, headless bots join and move |
| M3 | Characters | Persistent character IDs, random private professions, campaign registration, private data sent only to its owner |
| M4 | VANTA + IGL | IGL selection, one-way VANTA signal to IGL, IGL share UI (per item, per teammate), replacement IGL on disconnect |
| M5 | Subject | Subject identity + photo + approximate area, server-side schedule, manual identification, follow, noticing obvious surveillance |
| M6 | Case engine | Events → conditions → actions, branching, unit-tested, content defined as data |
| M7 | Investigation | Evidence, phone camera photos, conversations, CCTV path, vehicle clue, shared case board |
| M8 | Consequences | Subject route change/escape, NPC death, one police consequence, persistent world state |
| M9 | Save/Load | Campaign + character saves, versioned, round-trip tests |
| M10 | Vertical slice | CASE_001 complete and fun |

### First Playable (target of the current credit budget)
1. Two players connect. 2. VANTA selects an IGL. 3. IGL receives a Subject. 4. IGL shares selected info. 5. Players move through a small 3D district. 6. They find the Subject manually. 7. The Subject follows a schedule. 8. Players follow. 9. The Subject can notice obvious surveillance. 10. Evidence is found. 11. The case changes based on actions. 12. The result survives save/load.

Ugly is fine. Playable matters.

### CASE_001 (original prototype)
The Subject first seems ordinary and plausibly **in danger**; later evidence makes it plausible they may also be **dangerous**. Neither reading feels forced. Include: physical surveillance, one vehicle clue, one misleading clue, one honest witness, one deceptive witness, one digital clue, one location change, one consequence for excessive delay, at least three outcomes. No ending is labeled objectively correct.

---

## 6. How to Work Each Session

1. Read this file, `Docs/Roadmap.md` and the latest entry in `Docs/SessionLog.md`.
2. Check git status; never overwrite unrelated work.
3. Identify the earliest incomplete milestone, or do the task the user gave.
4. Pick the **smallest coherent slice** that moves it forward.
5. Implement → typecheck → build → run tests → fix → repeat.
6. Add/update tests for: save/load, stable IDs, case conditions/actions, profession assignment, IGL replacement, reconnect, evidence persistence, information filtering.
7. Update `Docs/Roadmap.md` checkboxes and append to `Docs/SessionLog.md`.
8. Commit with a clear message. Never commit `node_modules`, `dist`, caches, `.env` or local saves.
9. Finish with a short report:
   - what changed
   - what was tested and how
   - assets selected/researched (source + license)
   - blockers
   - how the user can run and playtest it locally
   - next recommended step

Do not generate thousands of lines in one go. Do not add features outside the current milestone; put ideas in `Docs/Backlog.md`.

---

## Final Principle

PROJECT VANTA is not about controlling an omniscient machine. It is about receiving just enough information from one to become responsible for what happens next.

VANTA knows more than the players. VANTA reveals less than they want. The players investigate the gap.

**That gap is the game.**
