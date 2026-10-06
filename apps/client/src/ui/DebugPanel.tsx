import type { DebugCaseState } from "@vanta/shared";

/** Dev-only case inspector. Shows hidden state on purpose: never part of normal play. */
export function DebugPanel({ state, onAdvance }: { state?: DebugCaseState; onAdvance: (sec: number) => void }) {
  return (
    <div className="vt-box vt-debug">
      <div className="vt-title">DEBUG · F9</div>
      {!state && <div className="vt-muted">no data (is the server in debug mode?)</div>}
      {state && (
        <>
          <div>
            stage <b>{state.stage}</b> · t={state.now}s{state.outcome ? ` · outcome ${state.outcome}` : ""}
          </div>
          <div className="vt-small">flags {JSON.stringify(state.flags)}</div>
          <div className="vt-small">counters {JSON.stringify(state.counters)}</div>
          <div className="vt-small">timers {state.timers.map((t) => `${t.id}@${Math.round(t.dueAt)}`).join(", ") || "none"}</div>
        </>
      )}
      <div className="vt-share">
        <button onClick={() => onAdvance(60)}>+1 min</button>
        <button onClick={() => onAdvance(300)}>+5 min</button>
      </div>
    </div>
  );
}
