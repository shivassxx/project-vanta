/** Server -> one client: the current line of a conversation and the options this player has. */
export interface DialogueView {
  npcId: string;
  /** What the player observes about the person (appearance only). */
  observed: string;
  line: string;
  options: { id: string; text: string }[];
  ended: boolean;
}

export const MSG_TALK = "talk";
export const MSG_TALK_CHOICE = "talkChoice";
export const MSG_TALK_END = "talkEnd";
export const MSG_DIALOGUE = "dialogue";
export const TALK_RANGE = 3;
