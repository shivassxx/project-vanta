import { describe, expect, it } from "vitest";
import { ActionMap } from "./actionMap";

describe("ActionMap", () => {
  it("maps raw inputs to actions and builds a move axis", () => {
    const m = new ActionMap();
    m.press("KeyW");
    m.press("KeyD");
    expect(m.moveAxis()).toEqual({ x: 1, y: 1 });
    m.release("KeyW");
    expect(m.moveAxis()).toEqual({ x: 1, y: 0 });
  });

  it("reports wasPressed once per press until endFrame", () => {
    const m = new ActionMap();
    m.press("KeyE");
    m.press("KeyE"); // key repeat
    expect(m.wasPressed("interact")).toBe(true);
    m.endFrame();
    expect(m.wasPressed("interact")).toBe(false);
    expect(m.isHeld("interact")).toBe(true);
  });
});
