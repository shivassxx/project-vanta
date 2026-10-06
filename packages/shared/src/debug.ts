/**
 * Dev-only tools (never needed for normal play). The server ignores these unless debug is enabled,
 * and answers only the requesting client.
 */
export type DebugCommand = { cmd: "state" } | { cmd: "advance"; sec: number };

export interface DebugCaseState {
  stage: string;
  outcome?: string;
  now: number;
  flags: Record<string, string | number | boolean>;
  counters: Record<string, number>;
  timers: { id: string; dueAt: number }[];
}

export const MSG_DEBUG = "debug";
export const MSG_DEBUG_STATE = "debugState";
