import { defineProject } from "vitest/config";

export default defineProject({
  test: {
    name: "agent-core",
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
