/** One step that upgrades a save from `from` to `from + 1`. Pure: returns new data. */
export interface Migration {
  from: number;
  migrate: (data: Record<string, unknown>) => Record<string, unknown>;
}

/**
 * Brings a versioned save up to `current`, one step at a time. Refuses (throws) instead of
 * guessing when a step is missing or the save is newer than this server: never silently corrupt.
 */
export function runMigrations<T>(raw: unknown, current: number, steps: readonly Migration[], what: string): T {
  if (!raw || typeof raw !== "object") throw new Error(`${what}: save is not an object`);
  let data = raw as Record<string, unknown>;
  const stamped = data.version;
  if (typeof stamped !== "number" || !Number.isInteger(stamped)) throw new Error(`${what}: save has no version`);
  let version: number = stamped;
  if (version > current) throw new Error(`${what}: save version ${version} is newer than supported ${current}`);
  while (version < current) {
    const step = steps.find((s) => s.from === version);
    if (!step) throw new Error(`${what}: no migration from version ${version}`);
    data = { ...step.migrate(data), version: version + 1 };
    version = version + 1;
  }
  return data as T;
}
