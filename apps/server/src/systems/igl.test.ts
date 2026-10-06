import { describe, expect, it } from "vitest";
import { IglSystem } from "./igl";

/** Deterministic rng from a list of values. */
const seq = (...values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length] ?? 0;
};

describe("IglSystem", () => {
  it("designates only once enough players are connected", () => {
    const s = new IglSystem(seq(0), 2);
    expect(s.ensure(["a"])).toBe(false);
    expect(s.igl).toBeUndefined();
    expect(s.ensure(["a", "b"])).toBe(true);
    expect(s.igl).toBe("a");
    expect(s.ensure(["a", "b", "c"])).toBe(false);
  });

  it("picks a temporary IGL on disconnect and restores on return when VANTA decides to", () => {
    const s = new IglSystem(seq(0, 0, 0.1), 2);
    s.ensure(["a", "b", "c"]);
    expect(s.onDisconnect("a", ["b", "c"])).toBe(true);
    expect(s.igl).toBe("b");
    expect(s.designated).toBe("a");
    expect(s.onReturn("a", ["a", "b", "c"])).toBe(true); // rng 0.1 < 0.5 -> restore
    expect(s.igl).toBe("a");
    expect(s.designated).toBeUndefined();
  });

  it("may keep the replacement when the original IGL returns", () => {
    const s = new IglSystem(seq(0, 0, 0.9), 2);
    s.ensure(["a", "b"]);
    s.onDisconnect("a", ["b"]);
    expect(s.onReturn("a", ["a", "b"])).toBe(false); // rng 0.9 -> keep b
    expect(s.igl).toBe("b");
    expect(s.designated).toBeUndefined();
  });

  it("ignores non-IGL disconnects and replaces a permanently removed IGL", () => {
    const s = new IglSystem(seq(0), 2);
    s.ensure(["a", "b", "c"]);
    expect(s.onDisconnect("b", ["a", "c"])).toBe(false);
    expect(s.onRemoved("a", ["b", "c"])).toBe(true);
    expect(s.igl).toBe("b");
  });

  it("clears the designation if the original IGL is removed while replaced", () => {
    const s = new IglSystem(seq(0), 2);
    s.ensure(["a", "b"]);
    s.onDisconnect("a", ["b"]);
    expect(s.onRemoved("a", ["b"])).toBe(false);
    expect(s.designated).toBeUndefined();
    expect(s.igl).toBe("b");
  });

  it("restores the returning IGL when nobody else was available", () => {
    const s = new IglSystem(seq(0, 0.99), 2);
    s.ensure(["a", "b"]);
    s.onDisconnect("a", []);
    expect(s.igl).toBeUndefined();
    expect(s.onReturn("a", ["a", "b"])).toBe(true);
    expect(s.igl).toBe("a");
  });
});
