import { Room, type Client } from "@colyseus/core";
import {
  GREYBOX_WALLS,
  GameState,
  MAX_PLAYERS,
  MSG_INPUT,
  PlayerState,
  RECONNECT_WINDOW_SECONDS,
  SPAWN_POINTS,
  SPRINT_SPEED,
  TICK_RATE,
  WALK_SPEED,
  moveWithCollision,
  worldDirection,
  type InputMessage,
} from "@vanta/shared";

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

  override onCreate(): void {
    this.setState(new GameState());
    this.onMessage(MSG_INPUT, (client, raw) => {
      const input = sanitizeInput(raw);
      if (input) this.inputs.set(client.sessionId, input);
    });
    this.setSimulationInterval(() => this.tick(1 / TICK_RATE), 1000 / TICK_RATE);
    console.log(`[Multiplayer] room ${this.roomId} created`);
  }

  override onJoin(client: Client): void {
    const p = new PlayerState();
    p.id = client.sessionId;
    const spawn = SPAWN_POINTS[this.state.players.size % SPAWN_POINTS.length];
    p.x = spawn?.x ?? 0;
    p.z = spawn?.z ?? 0;
    this.state.players.set(client.sessionId, p);
    console.log(`[Multiplayer] ${client.sessionId} joined ${this.roomId} (${this.state.players.size})`);
  }

  override async onLeave(client: Client, consented: boolean): Promise<void> {
    const p = this.state.players.get(client.sessionId);
    if (p && !consented) {
      p.connected = false;
      this.inputs.delete(client.sessionId);
      try {
        await this.allowReconnection(client, RECONNECT_WINDOW_SECONDS);
        p.connected = true;
        console.log(`[Multiplayer] ${client.sessionId} reconnected`);
        return;
      } catch {
        // window expired
      }
    }
    this.state.players.delete(client.sessionId);
    this.inputs.delete(client.sessionId);
    console.log(`[Multiplayer] ${client.sessionId} left ${this.roomId}`);
  }

  private tick(dt: number): void {
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
