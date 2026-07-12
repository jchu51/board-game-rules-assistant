import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      "./apps/api/vitest.config.ts",
      "./apps/packages/agent-core/vitest.config.ts",
      "./apps/packages/rag-core/vitest.config.ts",
      "./apps/web/vitest.config.ts",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json", "lcov"],
      thresholds: {
        lines: 80,
        statements: 80,
        functions: 80,
        branches: 80,
      },
    },
  },
});
