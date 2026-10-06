import type { ProfessionId } from "@vanta/shared";

/** SERVER-ONLY authored conversations. Requirements are checked on the server. */
export interface Requirement {
  /** Player holds this evidence. */
  evidence?: string;
  /** Player knows this info item (e.g. the Subject photo). */
  info?: string;
  /** Player's private background. */
  profession?: ProfessionId[];
}

export interface DialogueOption {
  id: string;
  text: string;
  requires?: Requirement;
  /** Next node; omitted = conversation ends after the reply. */
  next?: string;
  /** Testimony evidence granted to the talker. */
  gives?: string;
  /** Choosing this commits a crime of this kind; nearby people may see it. */
  crime?: string;
}

export interface DialogueNode {
  line: string;
  options: DialogueOption[];
}

export interface ConversationDef {
  id: string;
  start: string;
  nodes: Record<string, DialogueNode>;
}
