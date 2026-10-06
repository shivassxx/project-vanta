import { Client, type Room } from "colyseus.js";
import { randomBytes } from "node:crypto";
import {
  GAME_ROOM_NAME,
  MSG_BOARD,
  MSG_BOARD_COMMAND,
  MSG_EVIDENCE,
  MSG_INPUT,
  MSG_INTERACT,
  MSG_KNOWLEDGE,
  MSG_PRIVATE_PROFILE,
  MSG_SHARE_ITEM,
  MSG_ABILITIES,
  MSG_DIALOGUE,
  MSG_USE_ABILITY,
  MSG_TAKE_PHOTO,
  MSG_PHONE,
  type PhoneMessage,
  type AbilityView,
  MSG_TALK,
  MSG_TALK_CHOICE,
  type DialogueView,
  MSG_REQUEST_PRIVATE_SYNC,
  type Board,
  type BoardCommand,
  type FoundEvidence,
  type GameState,
  type InputMessage,
  type KnownInfo,
  type PrivateProfile,
  type ShareRequest,
} from "@vanta/shared";

export interface BotOptions {
  endpoint: string;
  /** Join a specific room; otherwise joinOrCreate. */
  roomId?: string;
  /** Reuse a token to come back as the same character. */
  playerToken?: string;
}

/** Headless test player. Architecturally separate from civilian NPC simulation. */
export class Bot {
  room?: Room<GameState>;
  private seq = 0;
  private readonly client: Client;
  readonly playerToken: string;
  /** Every message this bot received, by type (used to test information filtering). */
  readonly received: { type: string | number; message: unknown }[] = [];
  profile?: PrivateProfile;
  knowledge: KnownInfo[] = [];
  evidence: FoundEvidence[] = [];
  board: Board = { entries: [], links: [] };
  dialogue?: DialogueView;
  abilities: AbilityView[] = [];
  phone: PhoneMessage[] = [];

  constructor(private readonly opts: BotOptions) {
    this.client = new Client(opts.endpoint);
    this.playerToken = opts.playerToken ?? randomBytes(16).toString("hex");
  }

  async join(): Promise<Room<GameState>> {
    const options = { playerToken: this.playerToken };
    const room = this.opts.roomId
      ? await this.client.joinById<GameState>(this.opts.roomId, options)
      : await this.client.joinOrCreate<GameState>(GAME_ROOM_NAME, options);
    this.attach(room);
    return room;
  }

  private attach(room: Room<GameState>): void {
    this.room = room;
    room.onMessage("*", (type, message) => {
      this.received.push({ type, message });
      if (type === MSG_PRIVATE_PROFILE) this.profile = message as PrivateProfile;
      if (type === MSG_KNOWLEDGE) this.knowledge = message as KnownInfo[];
      if (type === MSG_EVIDENCE) this.evidence = message as FoundEvidence[];
      if (type === MSG_BOARD) this.board = message as Board;
      if (type === MSG_DIALOGUE) this.dialogue = message as DialogueView;
      if (type === MSG_ABILITIES) this.abilities = message as AbilityView[];
      if (type === MSG_PHONE) this.phone = message as PhoneMessage[];
    });
    room.send(MSG_REQUEST_PRIVATE_SYNC);
  }

  /** Simulates a network drop (non-consented leave). Returns the reconnection token. */
  drop(): string {
    const token = this.room?.reconnectionToken ?? "";
    this.room?.connection.close(3000, "simulated drop");
    return token;
  }

  async reconnect(token: string): Promise<Room<GameState>> {
    const room = await this.client.reconnect<GameState>(token);
    this.attach(room);
    return room;
  }

  get sessionId(): string {
    return this.room?.sessionId ?? "";
  }

  /** Raw send, also used by tests to try illegal input. */
  sendInput(partial: Partial<InputMessage> = {}): void {
    this.room?.send(MSG_INPUT, { seq: ++this.seq, x: 0, y: 1, yaw: 0, sprint: false, ...partial });
  }

  get characterId(): string {
    return this.profile?.characterId ?? "";
  }

  isIgl(): boolean {
    return !!this.characterId && this.room?.state.iglCharacterId === this.characterId;
  }

  share(itemId: string, toCharacterIds: string[]): void {
    const req: ShareRequest = { itemId, toCharacterIds };
    this.room?.send(MSG_SHARE_ITEM, req);
  }

  interact(targetId: string): void {
    this.room?.send(MSG_INTERACT, { targetId });
  }

  takePhoto(yaw = 0): void {
    this.room?.send(MSG_TAKE_PHOTO, { yaw });
  }

  useAbility(id: string): void {
    this.room?.send(MSG_USE_ABILITY, { id });
  }

  /**
   * Walks to a point through server-validated movement: first along X, then along Z
   * (enough for the open greybox paths used in tests). Resolves when within `tolerance`.
   */
  async walkTo(target: { x: number; z: number }, tolerance = 0.3, timeoutMs = 15000): Promise<void> {
    const until = Date.now() + timeoutMs;
    for (const axis of ["x", "z"] as const) {
      for (;;) {
        const p = this.position();
        if (!p) throw new Error("not in room");
        const d = target[axis] - p[axis];
        if (Math.abs(d) <= tolerance) break;
        if (Date.now() > until) throw new Error(`walkTo timed out at ${p.x.toFixed(1)},${p.z.toFixed(1)}`);
        // yaw 0: +x axis = +X, +y axis (forward) = -Z
        this.sendInput(axis === "x" ? { x: Math.sign(d), y: 0 } : { x: 0, y: -Math.sign(d) });
        await new Promise((r) => setTimeout(r, Math.abs(d) < 0.6 ? 20 : 50));
      }
      this.sendInput({ x: 0, y: 0 });
      await new Promise((r) => setTimeout(r, 120));
    }
  }

  talk(npcId: string): void {
    this.room?.send(MSG_TALK, { npcId });
  }

  choose(optionId: string): void {
    this.room?.send(MSG_TALK_CHOICE, { optionId });
  }

  boardCommand(cmd: BoardCommand): void {
    this.room?.send(MSG_BOARD_COMMAND, cmd);
  }

  position(): { x: number; z: number } | undefined {
    const p = this.room?.state.players.get(this.sessionId);
    return p ? { x: p.x, z: p.z } : undefined;
  }

  async leave(): Promise<void> {
    await this.room?.leave();
  }
}
