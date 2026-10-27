import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/unit/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/server.ts"],
      reporter: ["text", "json-summary"],
      thresholds: {
        lines: 85,
        functions: 80,
        branches: 70,
        statements: 85,
      },
    },
  },
});
