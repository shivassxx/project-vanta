import { Room } from "@colyseus/core";
import { Schema, type } from "@colyseus/schema";
import { MAX_PLAYERS } from "@vanta/shared";

export class LobbyState extends Schema {
  @type("number") playerCount = 0;
}

export class LobbyRoom extends Room<LobbyState> {
  override maxClients = MAX_PLAYERS;

  override onCreate(): void {
    this.setState(new LobbyState());
  }

  override onJoin(): void {
    this.state.playerCount = this.clients.length;
  }

  override onLeave(): void {
    this.state.playerCount = this.clients.length;
  }
}
