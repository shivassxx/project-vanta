import { describe, expect, it } from "vitest";
import { MAX_PLAYERS, MIN_PLAYERS } from "./index";

describe("shared constants", () => {
  it("allows 2-6 players", () => {
    expect(MIN_PLAYERS).toBe(2);
    expect(MAX_PLAYERS).toBe(6);
  });
});
