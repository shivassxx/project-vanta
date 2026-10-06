import { createCaseState, dispatch, nextTimerAt, type CaseDef, type CaseEvent, type CaseState, type Effect, type Primitive } from "@vanta/case-engine";

/**
 * Host side of the case engine: owns the runtime case state, keeps case time, feeds events and
 * hands effects back to the room. All game rules live in the case data.
 */
export class CaseRunner {
  state: CaseState;
  private time = 0;

  constructor(
    private readonly def: CaseDef,
    private readonly onEffect: (e: Effect) => void,
    /** Restored state from the world (a case continues across rooms). */
    initial?: CaseState,
    private readonly onChange: (s: CaseState) => void = () => undefined,
  ) {
    this.state = initial ?? createCaseState(def);
    this.time = this.state.now;
  }

  get now(): number {
    return this.time;
  }

  feed(type: string, payload?: Record<string, Primitive>): void {
    this.dispatch({ type, at: this.time, payload });
  }

  /** Advances case time; fires timers that became due. */
  advance(dt: number): void {
    this.time += dt;
    const next = nextTimerAt(this.state);
    if (next !== undefined && next <= this.time) this.dispatch({ type: "time", at: this.time });
  }

  private dispatch(event: CaseEvent): void {
    const r = dispatch(this.def, this.state, event);
    this.state = r.state;
    if (r.fired.length > 0) this.onChange(r.state);
    if (r.fired.length > 0) console.log(`[Cases] ${this.def.id} ${event.type} -> ${r.fired.join(", ")} (stage ${r.state.stage})`);
    for (const e of r.effects) this.onEffect(e);
  }
}
