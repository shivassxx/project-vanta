import { Room, type Client } from "@colyseus/core";
import {
  GREYBOX_WALLS,
  GameState,
  MAX_PLAYERS,
  MIN_PLAYERS,
  MSG_INPUT,
  MSG_KNOWLEDGE,
  MSG_SHARE_ITEM,
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
  type CharacterId,
  type InputMessage,
  type JoinOptions,
} from "@vanta/shared";
import { CASE_001_SUBJECT_SIGNAL } from "@vanta/content";
import { CharacterService, type Rng } from "../systems/characters";
import { IglSystem } from "../systems/igl";
import { NpcWorld, type SubjectEvent } from "../systems/subject/npcWorld";
import type { Observer } from "../systems/subject/awareness";
import { KnowledgeStore, checkShare } from "../systems/knowledge";
import type { CharacterRecord } from "../persistence/CharacterRepository";

export interface GameRoomOptions {
  characters: CharacterService;
  knowledge: KnowledgeStore;
  rng?: Rng;
  /** Delay between IGL designation and the first VANTA signal. */
  vantaDelayMs?: number;
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
  private vantaDelayMs = 4000;
  private signalState: "idle" | "scheduled" | "sent" = "idle";
  private npcWorld!: NpcWorld;
  private npcTimeScale = 1;

  override onCreate(options: GameRoomOptions): void {
    this.characterService = options.characters;
    this.knowledge = options.knowledge;
    this.igl = new IglSystem(options.rng ?? Math.random, MIN_PLAYERS);
    this.vantaDelayMs = options.vantaDelayMs ?? this.vantaDelayMs;
    this.setState(new GameState());
    this.npcTimeScale = options.npcTimeScale ?? 1;
    this.npcWorld = new NpcWorld(undefined, (e) => {
      console.log(`[NPC] ${e.type}`);
      options.onSubjectEvent?.(e);
    });
    this.npcWorld.populate(this.state.npcs);
    this.onMessage(MSG_REQUEST_PRIVATE_SYNC, (client) => {
      const record = this.characters.get(client.sessionId);
      // Private data goes only to the requesting owner.
      if (!record) return;
      client.send(MSG_PRIVATE_PROFILE, CharacterService.toPrivateProfile(record));
      client.send(MSG_KNOWLEDGE, this.knowledge.list(record.id));
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
    if (this.signalState === "sent") {
      // A new IGL inherits what VANTA had already delivered to the role.
      this.deliverSignal(igl);
    } else if (this.signalState === "idle") {
      this.signalState = "scheduled";
      this.clock.setTimeout(() => {
        this.signalState = "sent";
        if (this.igl.igl) this.deliverSignal(this.igl.igl);
      }, this.vantaDelayMs);
    }
  }

  /** One-way: VANTA sends Subject info to the IGL only. */
  private deliverSignal(characterId: CharacterId): void {
    const now = Date.now();
    for (const item of CASE_001_SUBJECT_SIGNAL) this.knowledge.grant(characterId, { item, source: "vanta", receivedAt: now });
    this.pushKnowledge(characterId);
    console.log(`[VANTA] signal delivered to ${characterId}`);
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
  }

  private tick(dt: number): void {
    const observers: Observer[] = [];
    this.state.players.forEach((p, id) => {
      if (p.connected) observers.push({ pos: { x: p.x, z: p.z }, sprinting: this.inputs.get(id)?.sprint === true && this.moving(id) });
    });
    this.npcWorld.tick(dt * this.npcTimeScale, observers, this.state.npcs);
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
