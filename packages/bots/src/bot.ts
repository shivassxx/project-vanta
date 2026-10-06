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
