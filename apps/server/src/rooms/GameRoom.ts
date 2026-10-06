import { Room, type Client } from "@colyseus/core";
import {
  GREYBOX_WALLS,
  GameState,
  MAX_PLAYERS,
  MIN_PLAYERS,
  MSG_BOARD,
  MSG_BOARD_COMMAND,
  MSG_EVIDENCE,
  MSG_INPUT,
  MSG_INTERACT,
  MSG_KNOWLEDGE,
  MSG_SHARE_ITEM,
  MSG_ABILITIES,
  MSG_USE_ABILITY,
  type EvidenceItem,
  MSG_DIALOGUE,
  MSG_TALK,
  MSG_TALK_CHOICE,
  MSG_TALK_END,
  TALK_RANGE,
  type DialogueView,
  MSG_PRIVATE_PROFILE,
  MSG_REQUEST_PRIVATE_SYNC,
  PLAYER_TOKEN_PATTERN,
  PlayerState,
  RECONNECT_WINDOW_SECONDS,
  SPAWN_POINTS,
  SPRINT_SPEED,
  TICK_RATE,
  WALK_SPEED,
  moveWithCollision,
  worldDirection,
  type Board,
  type CharacterId,
  type InputMessage,
  type JoinOptions,
} from "@vanta/shared";
import {
  CASE_001_ABILITIES,
  CASE_001_VEHICLES,
  CASE_001_CONVERSATIONS,
  CASE_001_EVIDENCE,
  CASE_001_EVIDENCE_ITEMS,
  CASE_001_ITEMS,
  CASE_001_RULES,
  type EvidenceSpotDef,
  type PersonDef,
} from "@vanta/content/server";
import { choose, nodeView, type TalkerContext } from "../systems/conversations";
import { availableAbilities } from "../systems/abilities";
import { VehicleWorld } from "../systems/vehicles";
import { applyBoardCommand, emptyBoard } from "../systems/board";
import { EvidenceStore, EvidenceWorld } from "../systems/evidence";
import type { Effect } from "@vanta/case-engine";
import { CaseRunner } from "../systems/cases/caseRunner";
import { CharacterService, type Rng } from "../systems/characters";
import { IglSystem } from "../systems/igl";
import { NpcWorld, type SubjectEvent } from "../systems/subject/npcWorld";
import type { Observer } from "../systems/subject/awareness";
import { KnowledgeStore, checkShare } from "../systems/knowledge";
import type { CharacterRecord } from "../persistence/CharacterRepository";

export interface GameRoomOptions {
  characters: CharacterService;
  knowledge: KnowledgeStore;
  evidence: EvidenceStore;
  /** Evidence placed in the world (tests may override). */
  evidenceSpots?: readonly EvidenceSpotDef[];
  rng?: Rng;
  /** Multiplies case time (tests only). */
  caseTimeScale?: number;
  /** People in the world (tests may override). */
  people?: readonly PersonDef[];
  /** Multiplies NPC simulation speed (tests only). */
  npcTimeScale?: number;
  /** Receives Subject events (future case engine hook). */
  onSubjectEvent?: (e: SubjectEvent) => void;
}

const finite = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);

/** Validates untrusted client input; returns undefined if malformed. */
export function sanitizeInput(raw: unknown): InputMessage | undefined {
  const m = raw as Partial<InputMessage> | null;
  if (!m || !finite(m.seq) || !finite(m.x) || !finite(m.y) || !finite(m.yaw)) return undefined;
  const len = Math.hypot(m.x, m.y);
  const k = len > 1 ? 1 / len : 1;
  return { seq: m.seq, x: m.x * k, y: m.y * k, yaw: m.yaw, sprint: m.sprint === true };
}

export class GameRoom extends Room<GameState> {
  override maxClients = MAX_PLAYERS;
  private readonly inputs = new Map<string, InputMessage>();
  private readonly characters = new Map<string, CharacterRecord>();
  private characterService!: CharacterService;
  private knowledge!: KnowledgeStore;
  private igl!: IglSystem;
  private caseRunner!: CaseRunner;
  private evidence!: EvidenceStore;
  private evidenceWorld!: EvidenceWorld;
  private board: Board = emptyBoard();
  private boardIds = 0;
  private vehicleWorld!: VehicleWorld;
  /** Abilities each character has already used (one use per case). */
  private readonly usedAbilities = new Map<CharacterId, Set<string>>();
  /** Open conversations by session ID. */
  private readonly talks = new Map<string, { npcId: string; conversation: string; node: string }>();
  private caseTimeScale = 1;
  private designatedOnce = false;
  /** Items VANTA has delivered to the IGL role; a new IGL inherits them. */
  private readonly deliveredToIgl: string[] = [];
  private npcWorld!: NpcWorld;
  private npcTimeScale = 1;

  override onCreate(options: GameRoomOptions): void {
    this.characterService = options.characters;
    this.knowledge = options.knowledge;
    this.igl = new IglSystem(options.rng ?? Math.random, MIN_PLAYERS);
    this.caseTimeScale = options.caseTimeScale ?? 1;
    this.caseRunner = new CaseRunner(CASE_001_RULES, (e) => this.applyEffect(e));
    this.setState(new GameState());
    this.npcTimeScale = options.npcTimeScale ?? 1;
    this.npcWorld = new NpcWorld(options.people, (e) => {
      console.log(`[NPC] ${e.type}`);
      options.onSubjectEvent?.(e);
      if (e.type === "subject.noticed") this.caseRunner.feed(e.type);
      else this.caseRunner.feed(e.type, { node: e.node, note: e.note ?? "" });
    });
    this.npcWorld.populate(this.state.npcs);
    this.evidence = options.evidence;
    this.evidenceWorld = new EvidenceWorld(options.evidenceSpots ?? CASE_001_EVIDENCE);
    this.evidenceWorld.populate(this.state.spots);
    this.vehicleWorld = new VehicleWorld(CASE_001_VEHICLES);
    this.vehicleWorld.populate(this.state.vehicles);
    this.onMessage(MSG_USE_ABILITY, (client, raw) => this.handleAbility(client, raw));
    this.onMessage(MSG_INTERACT, (client, raw) => this.handleInteract(client, raw));
    this.onMessage(MSG_BOARD_COMMAND, (client, raw) => this.handleBoard(client, raw));
    this.onMessage(MSG_TALK, (client, raw) => this.handleTalk(client, raw));
    this.onMessage(MSG_TALK_CHOICE, (client, raw) => this.handleTalkChoice(client, raw));
    this.onMessage(MSG_TALK_END, (client) => this.talks.delete(client.sessionId));
    this.onMessage(MSG_REQUEST_PRIVATE_SYNC, (client) => {
      const record = this.characters.get(client.sessionId);
      // Private data goes only to the requesting owner.
      if (!record) return;
      client.send(MSG_PRIVATE_PROFILE, CharacterService.toPrivateProfile(record));
      client.send(MSG_KNOWLEDGE, this.knowledge.list(record.id));
      client.send(MSG_EVIDENCE, this.evidence.list(record.id));
      client.send(MSG_ABILITIES, this.abilitiesOf(record.id));
      client.send(MSG_BOARD, this.board);
    });
    this.onMessage(MSG_SHARE_ITEM, (client, raw) => this.handleShare(client, raw));
    this.onMessage(MSG_INPUT, (client, raw) => {
      const input = sanitizeInput(raw);
      if (input) this.inputs.set(client.sessionId, input);
    });
    this.setSimulationInterval(() => this.tick(1 / TICK_RATE), 1000 / TICK_RATE);
    console.log(`[Multiplayer] room ${this.roomId} created`);
  }

  override onAuth(_client: Client, options: JoinOptions): boolean {
    if (typeof options?.playerToken !== "string" || !PLAYER_TOKEN_PATTERN.test(options.playerToken)) {
      throw new Error("invalid player token");
    }
    return true;
  }

  override onJoin(client: Client, options: JoinOptions): void {
    const record = this.characterService.getOrCreate(options.playerToken ?? "");
    for (const [sessionId, other] of this.characters) {
      if (other.id !== record.id) continue;
      if (this.state.players.get(sessionId)?.connected) throw new Error("character already in room");
      // Same character rejoining instead of reconnecting: replace the stale session.
      this.state.players.delete(sessionId);
      this.characters.delete(sessionId);
    }
    this.characters.set(client.sessionId, record);
    const p = new PlayerState();
    p.id = client.sessionId;
    p.characterId = record.id;
    const spawn = SPAWN_POINTS[this.state.players.size % SPAWN_POINTS.length];
    p.x = spawn?.x ?? 0;
    p.z = spawn?.z ?? 0;
    this.state.players.set(client.sessionId, p);
    console.log(`[Multiplayer] ${client.sessionId} joined ${this.roomId} (${this.state.players.size})`);
    if (this.igl.onReturn(record.id, this.connectedCharacters())) this.onIglChanged();
  }

  override async onLeave(client: Client, consented: boolean): Promise<void> {
    const p = this.state.players.get(client.sessionId);
    const characterId = this.characters.get(client.sessionId)?.id;
    if (p && characterId && !consented) {
      p.connected = false;
      this.inputs.delete(client.sessionId);
      if (this.igl.onDisconnect(characterId, this.connectedCharacters())) this.onIglChanged();
      try {
        const back = await this.allowReconnection(client, RECONNECT_WINDOW_SECONDS);
        if (!this.state.players.has(client.sessionId)) {
          // Session was replaced by a fresh join of the same character.
          back.leave();
          return;
        }
        p.connected = true;
        console.log(`[Multiplayer] ${client.sessionId} reconnected`);
        if (this.igl.onReturn(characterId, this.connectedCharacters())) this.onIglChanged();
        return;
      } catch {
        // window expired
      }
    }
    this.state.players.delete(client.sessionId);
    this.inputs.delete(client.sessionId);
    this.characters.delete(client.sessionId);
    this.talks.delete(client.sessionId);
    console.log(`[Multiplayer] ${client.sessionId} left ${this.roomId}`);
    if (characterId && this.igl.onRemoved(characterId, this.connectedCharacters())) this.onIglChanged();
  }

  private moving(sessionId: string): boolean {
    const i = this.inputs.get(sessionId);
    return !!i && (i.x !== 0 || i.y !== 0);
  }

  private connectedCharacters(): CharacterId[] {
    const ids: CharacterId[] = [];
    this.state.players.forEach((p) => p.connected && ids.push(p.characterId));
    return ids;
  }

  private clientFor(characterId: CharacterId): Client | undefined {
    return this.clients.find((c) => this.characters.get(c.sessionId)?.id === characterId);
  }

  private pushKnowledge(characterId: CharacterId): void {
    this.clientFor(characterId)?.send(MSG_KNOWLEDGE, this.knowledge.list(characterId));
  }

  private onIglChanged(): void {
    const igl = this.igl.igl;
    this.state.iglCharacterId = igl ?? "";
    console.log(`[VANTA] IGL is now ${igl ?? "none"} in ${this.roomId}`);
    if (!igl) return;
    if (!this.designatedOnce) {
      this.designatedOnce = true;
      this.caseRunner.feed("igl.designated");
    }
    // A new IGL inherits what VANTA had already delivered to the role.
    this.deliverToIgl(igl, this.deliveredToIgl);
  }

  private applyEffect(e: Effect): void {
    if (e.type === "vanta.deliver") {
      const items = (e.payload?.items as string[] | undefined) ?? [];
      this.deliveredToIgl.push(...items.filter((id) => !this.deliveredToIgl.includes(id)));
      if (this.igl.igl) this.deliverToIgl(this.igl.igl, items);
    } else if (e.type === "subject.alert") {
      console.log(`[NPC] subject alert: ${String(e.payload?.level)} (behavior change arrives in M8)`);
    } else if (e.type === "case.outcome") {
      console.log(`[Cases] outcome ${String(e.payload?.outcome)}`);
    } else {
      console.log(`[Cases] unhandled effect ${e.type}`);
    }
  }

  /** One-way: VANTA sends Subject info to the IGL only. */
  private deliverToIgl(characterId: CharacterId, itemIds: readonly string[]): void {
    if (itemIds.length === 0) return;
    const now = Date.now();
    for (const id of itemIds) {
      const item = CASE_001_ITEMS.get(id);
      if (item) this.knowledge.grant(characterId, { item, source: "vanta", receivedAt: now });
    }
    this.pushKnowledge(characterId);
    console.log(`[VANTA] delivered ${itemIds.length} item(s) to ${characterId}`);
  }

  /** Examine a world spot; distance is checked against the server-side position. */
  private handleInteract(client: Client, raw: unknown): void {
    const characterId = this.characters.get(client.sessionId)?.id;
    const p = this.state.players.get(client.sessionId);
    if (!characterId || !p) return;
    const r = this.evidenceWorld.examine((raw as { targetId?: unknown } | null)?.targetId, { x: p.x, z: p.z });
    if (!r.ok) return;
    if (r.removed) this.state.spots.delete(r.def.spotId);
    this.grantEvidence(characterId, r.def.item);
  }

  private talkerContext(characterId: CharacterId): TalkerContext {
    const record = [...this.characters.values()].find((r) => r.id === characterId);
    return {
      hasEvidence: (id) => !!this.evidence.has(characterId, id),
      knowsInfo: (id) => !!this.knowledge.get(characterId, id),
      profession: record?.professionId ?? "",
    };
  }

  /** Returns the person or vehicle if the player is close enough; checked with server positions. */
  private reachablePerson(sessionId: string, npcId: unknown) {
    const p = this.state.players.get(sessionId);
    const person = typeof npcId === "string" ? (this.npcWorld.find(npcId) ?? this.vehicleWorld.find(npcId)) : undefined;
    if (!p || !person || Math.hypot(person.pos.x - p.x, person.pos.z - p.z) > TALK_RANGE + 0.5) return undefined;
    return { person, from: { x: p.x, z: p.z } };
  }

  private sendDialogue(client: Client, view: DialogueView): void {
    client.send(MSG_DIALOGUE, view);
  }

  private handleTalk(client: Client, raw: unknown): void {
    const characterId = this.characters.get(client.sessionId)?.id;
    const npcId = (raw as { npcId?: unknown } | null)?.npcId;
    const reach = this.reachablePerson(client.sessionId, npcId);
    if (!characterId || !reach || typeof npcId !== "string") return;
    const def = CASE_001_CONVERSATIONS.get(reach.person.conversation);
    const view = def && nodeView(def, def.start, this.talkerContext(characterId));
    if (!def || !view) return;
    this.talks.set(client.sessionId, { npcId, conversation: def.id, node: def.start });
    this.npcWorld.confront(npcId, reach.from);
    this.sendDialogue(client, { npcId, observed: reach.person.observed, ...view, ended: false });
    this.caseRunner.feed("conversation.started", { conversation: def.id });
  }

  private handleTalkChoice(client: Client, raw: unknown): void {
    const talk = this.talks.get(client.sessionId);
    const characterId = this.characters.get(client.sessionId)?.id;
    if (!talk || !characterId) return;
    const reach = this.reachablePerson(client.sessionId, talk.npcId);
    const def = CASE_001_CONVERSATIONS.get(talk.conversation);
    if (!reach || !def) {
      // Walked away mid-conversation.
      this.talks.delete(client.sessionId);
      this.sendDialogue(client, { npcId: talk.npcId, observed: "", line: "", options: [], ended: true });
      return;
    }
    const ctx = this.talkerContext(characterId);
    const r = choose(def, talk.node, (raw as { optionId?: unknown } | null)?.optionId, ctx);
    if (!r.ok) return;
    this.caseRunner.feed("conversation.choice", { conversation: def.id, option: `${talk.node}.${r.option.id}` });
    const testimony = r.option.gives ? CASE_001_EVIDENCE_ITEMS.get(r.option.gives) : undefined;
    if (testimony) this.grantEvidence(characterId, testimony);
    const view = r.next ? nodeView(def, r.next, ctx) : undefined;
    if (!view || !r.next) {
      this.talks.delete(client.sessionId);
      this.sendDialogue(client, { npcId: talk.npcId, observed: reach.person.observed, line: "", options: [], ended: true });
      return;
    }
    talk.node = r.next;
    this.sendDialogue(client, { npcId: talk.npcId, observed: reach.person.observed, ...view, ended: false });
  }

  /** Gives evidence to a character, refreshes their private lists and tells the case engine. */
  private grantEvidence(characterId: CharacterId, item: EvidenceItem): void {
    if (!this.evidence.grant(characterId, { item, foundBy: characterId, foundAt: Date.now() })) return;
    const client = this.clientFor(characterId);
    client?.send(MSG_EVIDENCE, this.evidence.list(characterId));
    client?.send(MSG_ABILITIES, this.abilitiesOf(characterId));
    console.log(`[Evidence] ${characterId} obtained ${item.id}`);
    this.caseRunner.feed("evidence.found", { evidenceId: item.id });
  }

  private abilitiesOf(characterId: CharacterId) {
    const record = [...this.characters.values()].find((r) => r.id === characterId);
    return availableAbilities(
      CASE_001_ABILITIES,
      record?.professionId ?? "",
      (id) => !!this.evidence.has(characterId, id),
      this.usedAbilities.get(characterId) ?? new Set(),
    );
  }

  private handleAbility(client: Client, raw: unknown): void {
    const characterId = this.characters.get(client.sessionId)?.id;
    const id = (raw as { id?: unknown } | null)?.id;
    if (!characterId || !this.abilitiesOf(characterId).some((a) => a.id === id)) return;
    const def = CASE_001_ABILITIES.find((a) => a.id === id);
    const item = def && CASE_001_EVIDENCE_ITEMS.get(def.grants);
    if (!def || !item) return;
    const used = this.usedAbilities.get(characterId) ?? new Set<string>();
    used.add(def.id);
    this.usedAbilities.set(characterId, used);
    client.send(MSG_ABILITIES, this.abilitiesOf(characterId));
    console.log(`[Investigation] ${characterId} used ${def.id}`);
    this.caseRunner.feed(def.caseEvent);
    const deliver = () => this.grantEvidence(characterId, item);
    if (def.delaySec > 0) this.clock.setTimeout(deliver, (def.delaySec * 1000) / this.caseTimeScale);
    else deliver();
  }

  /** Team case board: shared with everyone in the room once something is pinned. */
  private handleBoard(client: Client, raw: unknown): void {
    const actor = this.characters.get(client.sessionId)?.id;
    if (!actor) return;
    const r = applyBoardCommand(this.board, raw, {
      actor,
      evidenceOf: (id) => this.evidence.has(actor, id)?.item,
      infoOf: (id) => this.knowledge.get(actor, id),
      newId: () => `b${++this.boardIds}`,
    });
    if (!r.ok) {
      console.log(`[Investigation] board command rejected from ${actor}: ${r.reason}`);
      return;
    }
    this.board = r.board;
    this.broadcast(MSG_BOARD, this.board);
    if (r.event) this.caseRunner.feed(r.event.type, r.event.refId ? { refId: r.event.refId } : undefined);
  }

  private handleShare(client: Client, raw: unknown): void {
    const sender = this.characters.get(client.sessionId)?.id;
    if (!sender) return;
    const inRoom = new Set([...this.characters.values()].map((r) => r.id));
    const check = checkShare(raw, sender, this.igl.igl, this.knowledge, inRoom);
    if (!check.ok) {
      console.log(`[Investigation] share rejected from ${sender}: ${check.reason}`);
      return;
    }
    const item = this.knowledge.get(sender, (raw as { itemId: string }).itemId);
    if (!item) return;
    const now = Date.now();
    for (const to of check.recipients) {
      if (this.knowledge.grant(to, { item, source: "teammate", fromCharacterId: sender, receivedAt: now })) this.pushKnowledge(to);
    }
    console.log(`[Investigation] ${sender} shared ${item.id} with ${check.recipients.length} teammate(s)`);
    this.caseRunner.feed("info.shared", { itemId: item.id });
  }

  private tick(dt: number): void {
    const observers: Observer[] = [];
    this.state.players.forEach((p, id) => {
      if (p.connected) observers.push({ pos: { x: p.x, z: p.z }, sprinting: this.inputs.get(id)?.sprint === true && this.moving(id) });
    });
    this.npcWorld.tick(dt * this.npcTimeScale, observers, this.state.npcs);
    this.caseRunner.advance(dt * this.caseTimeScale);
    this.state.players.forEach((p, id) => {
      const input = this.inputs.get(id);
      if (!input) return;
      const dir = worldDirection({ x: input.x, y: input.y }, input.yaw);
      const speed = input.sprint ? SPRINT_SPEED : WALK_SPEED;
      const next = moveWithCollision({ x: p.x, z: p.z }, { x: dir.x * speed * dt, z: dir.z * speed * dt }, GREYBOX_WALLS);
      p.x = next.x;
      p.z = next.z;
      if (dir.x !== 0 || dir.z !== 0) p.facing = Math.atan2(-dir.x, -dir.z);
      p.ackSeq = input.seq;
    });
  }
}
