export type Primitive = string | number | boolean;

/** Something that happened. The host (server) translates game activity into these. */
export interface CaseEvent {
  type: string;
  /** Case time in seconds when the event happened. */
  at: number;
  payload?: Record<string, Primitive>;
}

/** Data-only conditions. */
export type Condition =
  | { flag: string; equals: Primitive }
  | { flagSet: string }
  | { counter: string; gte?: number; lte?: number; eq?: number }
  | { stage: string }
  | { stageIn: string[] }
  | { payload: string; equals: Primitive }
  | { all: Condition[] }
  | { any: Condition[] }
  | { not: Condition };

/** Effects are instructions to the host; the engine never performs I/O itself. */
export interface Effect {
  type: string;
  payload?: Record<string, Primitive | Primitive[]>;
}

/** Data-only actions. */
export type Action =
  | { setFlag: string; value: Primitive }
  | { increment: string; by?: number }
  | { setStage: string }
  | { startTimer: string; afterSec: number }
  | { cancelTimer: string }
  | { setOutcome: string }
  | { effect: Effect };

export interface Rule {
  id: string;
  /** Event type that triggers the rule. Timers fire as `timer:<id>`; stage changes as `stage:<name>`. */
  on: string;
  when?: Condition;
  do: Action[];
  /** Fire at most once (default true). */
  once?: boolean;
}

export interface CaseDef {
  id: string;
  initialStage: string;
  rules: Rule[];
}

export interface Timer {
  id: string;
  dueAt: number;
}

/** Serializable runtime state (stable string IDs only). */
export interface CaseState {
  caseId: string;
  stage: string;
  flags: Record<string, Primitive>;
  counters: Record<string, number>;
  timers: Timer[];
  firedRules: string[];
  outcome?: string;
  /** Last case time the engine has seen. */
  now: number;
}

export interface DispatchResult {
  state: CaseState;
  effects: Effect[];
  /** Rule IDs that fired during this dispatch, in order (for logs and tests). */
  fired: string[];
}
