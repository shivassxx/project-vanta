import type { CaseEvent, CaseState, Condition } from "./types";

export function evaluate(c: Condition, state: CaseState, event: CaseEvent): boolean {
  if ("all" in c) return c.all.every((x) => evaluate(x, state, event));
  if ("any" in c) return c.any.some((x) => evaluate(x, state, event));
  if ("not" in c) return !evaluate(c.not, state, event);
  if ("flagSet" in c) return c.flagSet in state.flags;
  if ("flag" in c) return state.flags[c.flag] === c.equals;
  if ("stageIn" in c) return c.stageIn.includes(state.stage);
  if ("stage" in c) return state.stage === c.stage;
  if ("payload" in c) return event.payload?.[c.payload] === c.equals;
  if ("counter" in c) {
    const v = state.counters[c.counter] ?? 0;
    if (c.gte !== undefined && v < c.gte) return false;
    if (c.lte !== undefined && v > c.lte) return false;
    if (c.eq !== undefined && v !== c.eq) return false;
    return true;
  }
  return false;
}
