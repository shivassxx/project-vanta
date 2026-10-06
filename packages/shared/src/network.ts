import { MapSchema, Schema, defineTypes } from "@colyseus/schema";

export const GAME_ROOM_NAME = "game";
export const TICK_RATE = 20;
export const RECONNECT_WINDOW_SECONDS = 20;

/** Client -> server input; the server never trusts positions, only intent. */
export interface InputMessage {
  seq: number;
  /** Move axis, each in [-1, 1]; y = forward. */
  x: number;
  y: number;
  /** Camera yaw in radians. */
  yaw: number;
  sprint: boolean;
}

export const MSG_INPUT = "input";

// Schema fields use `declare` + defineTypes (no decorators), so every TS toolchain
// (tsc, Vite, tsx) compiles them identically.
export class PlayerState extends Schema {
  declare id: string;
  /** Stable public character ID. Private data (profession etc.) is never stored here. */
  declare characterId: string;
  declare x: number;
  declare z: number;
  declare facing: number;
  declare connected: boolean;
  /** Last input sequence number the server has applied (for reconciliation). */
  declare ackSeq: number;

  constructor() {
    super();
    this.id = "";
    this.characterId = "";
    this.x = 0;
    this.z = 0;
    this.facing = 0;
    this.connected = true;
    this.ackSeq = 0;
  }
}
defineTypes(PlayerState, {
  id: "string",
  characterId: "string",
  x: "number",
  z: "number",
  facing: "number",
  connected: "boolean",
  ackSeq: "number",
});

export class GameState extends Schema {
  declare players: MapSchema<PlayerState>;
  /** Public: who VANTA designated. Never why. Empty when none. */
  declare iglCharacterId: string;

  constructor() {
    super();
    this.players = new MapSchema<PlayerState>();
    this.iglCharacterId = "";
  }
}
defineTypes(GameState, { players: { map: PlayerState }, iglCharacterId: "string" });
