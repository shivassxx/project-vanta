import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["{apps,packages}/*/src/**/*.test.ts"],
    // Colyseus treats process.send (present in forked workers) as a PM2/cluster channel.
    pool: "threads",
  },
});
