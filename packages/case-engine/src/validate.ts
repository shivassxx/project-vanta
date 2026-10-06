import type { Action, CaseDef, Condition } from "./types";

/** Static checks for case content. Returns a list of problems (empty = valid). */
export function validateCaseDef(def: CaseDef): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  const stages = new Set<string>([def.initialStage]);
  const timersStarted = new Set<string>();

  for (const r of def.rules) {
    if (ids.has(r.id)) problems.push(`duplicate rule id ${r.id}`);
    ids.add(r.id);
    if (r.do.length === 0) problems.push(`rule ${r.id} has no actions`);
    for (const a of r.do) collectAction(a, stages, timersStarted);
  }
  for (const r of def.rules) {
    if (r.on.startsWith("timer:") && !timersStarted.has(r.on.slice(6))) problems.push(`rule ${r.id} waits for timer ${r.on.slice(6)} that is never started`);
    if (r.on.startsWith("stage:") && !stages.has(r.on.slice(6))) problems.push(`rule ${r.id} waits for unknown stage ${r.on.slice(6)}`);
    if (r.when) for (const s of stagesIn(r.when)) if (!stages.has(s)) problems.push(`rule ${r.id} checks unknown stage ${s}`);
  }
  return problems;
}

function collectAction(a: Action, stages: Set<string>, timers: Set<string>): void {
  if ("setStage" in a) stages.add(a.setStage);
  if ("startTimer" in a) timers.add(a.startTimer);
}

function stagesIn(c: Condition): string[] {
  if ("all" in c) return c.all.flatMap(stagesIn);
  if ("any" in c) return c.any.flatMap(stagesIn);
  if ("not" in c) return stagesIn(c.not);
  if ("stage" in c) return [c.stage];
  if ("stageIn" in c) return c.stageIn;
  return [];
}
