import type { ConversationDef, DialogueOption, Requirement } from "@vanta/content/server";
import type { ProfessionId } from "@vanta/shared";

/** What the server knows about the talking player when checking requirements. */
export interface TalkerContext {
  hasEvidence: (id: string) => boolean;
  knowsInfo: (id: string) => boolean;
  profession: ProfessionId;
}

export function meets(req: Requirement | undefined, ctx: TalkerContext): boolean {
  if (!req) return true;
  if (req.evidence && !ctx.hasEvidence(req.evidence)) return false;
  if (req.info && !ctx.knowsInfo(req.info)) return false;
  if (req.profession && !req.profession.includes(ctx.profession)) return false;
  return true;
}

/** The line and only the options this player can actually use. Hidden options never leave the server. */
export function nodeView(def: ConversationDef, nodeId: string, ctx: TalkerContext): { line: string; options: { id: string; text: string }[] } | undefined {
  const node = def.nodes[nodeId];
  if (!node) return undefined;
  return { line: node.line, options: node.options.filter((o) => meets(o.requires, ctx)).map((o) => ({ id: o.id, text: o.text })) };
}

export type ChoiceResult = { ok: true; option: DialogueOption; next?: string } | { ok: false };

export function choose(def: ConversationDef, nodeId: string, optionId: unknown, ctx: TalkerContext): ChoiceResult {
  const option = def.nodes[nodeId]?.options.find((o) => o.id === optionId);
  if (!option || !meets(option.requires, ctx)) return { ok: false };
  return { ok: true, option, next: option.next };
}
