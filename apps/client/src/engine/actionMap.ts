export type Action =
  | "moveForward"
  | "moveBack"
  | "moveLeft"
  | "moveRight"
  | "sprint"
  | "interact"
  | "aim"
  | "investigate";

export type Bindings = Record<Action, string[]>;

/** Keyboard/mouse defaults. Values are KeyboardEvent.code or "Mouse<button>". */
export const DEFAULT_BINDINGS: Bindings = {
  moveForward: ["KeyW", "ArrowUp"],
  moveBack: ["KeyS", "ArrowDown"],
  moveLeft: ["KeyA", "ArrowLeft"],
  moveRight: ["KeyD", "ArrowRight"],
  sprint: ["ShiftLeft"],
  interact: ["KeyE"],
  aim: ["Mouse2"],
  investigate: ["KeyF"],
};

/** Tracks raw inputs and exposes them only as actions. Gameplay never sees raw keys. */
export class ActionMap {
  private readonly down = new Set<string>();
  private readonly pressed = new Set<Action>();

  constructor(private readonly bindings: Bindings = DEFAULT_BINDINGS) {}

  private actionsFor(input: string): Action[] {
    return (Object.keys(this.bindings) as Action[]).filter((a) => this.bindings[a].includes(input));
  }

  press(input: string): void {
    if (!this.down.has(input)) this.actionsFor(input).forEach((a) => this.pressed.add(a));
    this.down.add(input);
  }

  release(input: string): void {
    this.down.delete(input);
  }

  isHeld(action: Action): boolean {
    return this.bindings[action].some((i) => this.down.has(i));
  }

  /** True once per press; cleared by endFrame(). */
  wasPressed(action: Action): boolean {
    return this.pressed.has(action);
  }

  /** Movement axes in [-1, 1]; x = right, y = forward. */
  moveAxis(): { x: number; y: number } {
    return {
      x: Number(this.isHeld("moveRight")) - Number(this.isHeld("moveLeft")),
      y: Number(this.isHeld("moveForward")) - Number(this.isHeld("moveBack")),
    };
  }

  endFrame(): void {
    this.pressed.clear();
  }
}
