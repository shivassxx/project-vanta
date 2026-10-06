import { evaluate } from "./conditions";
import type { Action, CaseDef, CaseEvent, CaseState, DispatchResult, Effect } from "./types";

/** Guards against rules that endlessly trigger each other through stage/timer events. */
const MAX_CASCADE = 64;

export function createCaseState(def: CaseDef): CaseState {
  return {
    caseId: def.id,
    stage: def.initialStage,
    flags: {},
    counters: {},
    timers: [],
    firedRules: [],
    now: 0,
  };
}

const clone = (s: CaseState): CaseState => ({
  ...s,
  flags: { ...s.flags },
  counters: { ...s.counters },
  timers: s.timers.map((t) => ({ ...t })),
  firedRules: [...s.firedRules],
});

/**
 * Pure: applies one event (plus any timers that became due and the stage events it causes)
 * and returns the new state and the effects for the host. The input state is not mutated.
 */
export function dispatch(def: CaseDef, input: CaseState, event: CaseEvent): DispatchResult {
  const state = clone(input);
  const effects: Effect[] = [];
  const fired: string[] = [];
  if (state.outcome !== undefined) return { state, effects, fired };

  state.now = Math.max(state.now, event.at);
  const queue: CaseEvent[] = [];
  // Timers that are due fire before the event itself, in due order.
  const due = state.timers.filter((t) => t.dueAt <= state.now).sort((a, b) => a.dueAt - b.dueAt);
  state.timers = state.timers.filter((t) => t.dueAt > state.now);
  for (const t of due) queue.push({ type: `timer:${t.id}`, at: t.dueAt });
  queue.push(event);

  let processed = 0;
  while (queue.length > 0 && state.outcome === undefined) {
    if (++processed > MAX_CASCADE) throw new Error(`case ${def.id}: event cascade exceeded ${MAX_CASCADE}`);
    const ev = queue.shift() as CaseEvent;
    for (const rule of def.rules) {
      if (rule.on !== ev.type) continue;
      if (rule.once !== false && state.firedRules.includes(rule.id)) continue;
      if (rule.when && !evaluate(rule.when, state, ev)) continue;
      if (!state.firedRules.includes(rule.id)) state.firedRules.push(rule.id);
      fired.push(rule.id);
      for (const action of rule.do) apply(action, state, ev, queue, effects);
      if (state.outcome !== undefined) break;
    }
  }
  return { state, effects, fired };
}

function apply(a: Action, state: CaseState, ev: CaseEvent, queue: CaseEvent[], effects: Effect[]): void {
  if ("setFlag" in a) state.flags[a.setFlag] = a.value;
  else if ("increment" in a) state.counters[a.increment] = (state.counters[a.increment] ?? 0) + (a.by ?? 1);
  else if ("setStage" in a) {
    if (state.stage !== a.setStage) {
      state.stage = a.setStage;
      queue.push({ type: `stage:${a.setStage}`, at: ev.at });
    }
  } else if ("startTimer" in a) {
    state.timers = state.timers.filter((t) => t.id !== a.startTimer);
    state.timers.push({ id: a.startTimer, dueAt: ev.at + a.afterSec });
  } else if ("cancelTimer" in a) state.timers = state.timers.filter((t) => t.id !== a.cancelTimer);
  else if ("setOutcome" in a) {
    state.outcome = a.setOutcome;
    effects.push({ type: "case.outcome", payload: { outcome: a.setOutcome } });
  } else if ("effect" in a) effects.push(a.effect);
}

/** Earliest pending timer, so the host knows when to send the next time event. */
export function nextTimerAt(state: CaseState): number | undefined {
  return state.timers.reduce<number | undefined>((m, t) => (m === undefined || t.dueAt < m ? t.dueAt : m), undefined);
}
