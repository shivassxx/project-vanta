import { Client, type Room } from "colyseus.js";
import { DEFAULT_SERVER_PORT, GAME_ROOM_NAME, type GameState, type JoinOptions } from "@vanta/shared";
import { getPlayerToken } from "./profile";

const TOKEN_KEY = "vanta.reconnectionToken";

function readToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function writeToken(token: string | null): void {
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // storage unavailable; reconnect after reload just won't work
  }
}

/**
 * Reconnects (same tab, within the server's window) if possible; otherwise joins the
 * room in the URL hash, or creates/joins a game room.
 */
export async function connect(): Promise<Room<GameState>> {
  const client = new Client(`ws://${location.hostname}:${DEFAULT_SERVER_PORT}`);
  const token = readToken();
  let room: Room<GameState> | undefined;
  if (token) {
    try {
      room = await client.reconnect<GameState>(token);
      console.info("[Multiplayer] reconnected");
    } catch {
      writeToken(null);
    }
  }
  if (!room) {
    const roomId = location.hash.slice(1);
    const options: JoinOptions = { playerToken: getPlayerToken() };
    room = roomId
      ? await client.joinById<GameState>(roomId, options)
      : await client.joinOrCreate<GameState>(GAME_ROOM_NAME, options);
  }
  writeToken(room.reconnectionToken);
  location.hash = room.roomId;
  return room;
}
