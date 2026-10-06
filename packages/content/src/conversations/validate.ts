import type { ConversationDef } from "./types";

/** Static checks: start and every `next` exist, option IDs unique per node, `gives` known. */
export function validateConversation(def: ConversationDef, knownEvidence: ReadonlySet<string>): string[] {
  const problems: string[] = [];
  if (!def.nodes[def.start]) problems.push(`${def.id}: missing start node ${def.start}`);
  for (const [nodeId, node] of Object.entries(def.nodes)) {
    const ids = new Set<string>();
    if (node.options.length === 0) problems.push(`${def.id}.${nodeId}: no options`);
    for (const o of node.options) {
      if (ids.has(o.id)) problems.push(`${def.id}.${nodeId}: duplicate option ${o.id}`);
      ids.add(o.id);
      if (o.next && !def.nodes[o.next]) problems.push(`${def.id}.${nodeId}.${o.id}: unknown next ${o.next}`);
      if (o.gives && !knownEvidence.has(o.gives)) problems.push(`${def.id}.${nodeId}.${o.id}: unknown evidence ${o.gives}`);
    }
    // Every node must offer at least one option without requirements, so no one gets stuck.
    if (node.options.length > 0 && node.options.every((o) => o.requires)) problems.push(`${def.id}.${nodeId}: no unconditional option`);
  }
  return problems;
}
