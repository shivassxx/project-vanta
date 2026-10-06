import { Client, type Room } from "colyseus.js";
import { GAME_ROOM_NAME, MSG_INPUT, type GameState, type InputMessage } from "@vanta/shared";

export interface BotOptions {
  endpoint: string;
  /** Join a specific room; otherwise joinOrCreate. */
  roomId?: string;
}

/** Headless test player. Architecturally separate from civilian NPC simulation. */
export class Bot {
  room?: Room<GameState>;
  private seq = 0;
  private readonly client: Client;

  constructor(private readonly opts: BotOptions) {
    this.client = new Client(opts.endpoint);
  }

  async join(): Promise<Room<GameState>> {
    this.room = this.opts.roomId
      ? await this.client.joinById<GameState>(this.opts.roomId)
      : await this.client.joinOrCreate<GameState>(GAME_ROOM_NAME);
    return this.room;
  }

  /** Simulates a network drop (non-consented leave). Returns the reconnection token. */
  drop(): string {
    const token = this.room?.reconnectionToken ?? "";
    this.room?.connection.close(3000, "simulated drop");
    return token;
  }

  async reconnect(token: string): Promise<Room<GameState>> {
    this.room = await this.client.reconnect<GameState>(token);
    return this.room;
  }

  get sessionId(): string {
    return this.room?.sessionId ?? "";
  }

  /** Raw send, also used by tests to try illegal input. */
  sendInput(partial: Partial<InputMessage> = {}): void {
    this.room?.send(MSG_INPUT, { seq: ++this.seq, x: 0, y: 1, yaw: 0, sprint: false, ...partial });
  }

  position(): { x: number; z: number } | undefined {
    const p = this.room?.state.players.get(this.sessionId);
    return p ? { x: p.x, z: p.z } : undefined;
  }

  async leave(): Promise<void> {
    await this.room?.leave();
  }
}
