import { describe, expect, it } from "vitest";
import { runMigrations, type Migration } from "./migrations";

const steps: Migration[] = [
  { from: 1, migrate: (d) => ({ ...d, b: "added in 2" }) },
  { from: 2, migrate: (d) => ({ ...d, a: String(d.a) }) },
];

describe("runMigrations", () => {
  it("applies every step in order and stamps the new version", () => {
    expect(runMigrations({ version: 1, a: 5 }, 3, steps, "test")).toEqual({ version: 3, a: "5", b: "added in 2" });
  });

  it("leaves current saves untouched", () => {
    expect(runMigrations({ version: 3, a: "x" }, 3, steps, "test")).toEqual({ version: 3, a: "x" });
  });

  it("refuses newer, unversioned, non-object or unmigratable saves", () => {
    expect(() => runMigrations({ version: 4 }, 3, steps, "test")).toThrow(/newer/);
    expect(() => runMigrations({ a: 1 }, 3, steps, "test")).toThrow(/no version/);
    expect(() => runMigrations("junk", 3, steps, "test")).toThrow(/not an object/);
    expect(() => runMigrations({ version: 0 }, 3, steps, "test")).toThrow(/no migration from version 0/);
  });
});
