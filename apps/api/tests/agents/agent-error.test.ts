import { describe, expect, it } from "vitest";

import { AgentError } from "../../src/infrastructure/agents/agents/agent-error";

describe("AgentError", () => {
  it("wraps failed agent runs with the agent name and cause", () => {
    const cause = new Error("model failed");
    const error = AgentError.runFailed("rule-agent", cause);

    expect(error.name).toBe("AgentError");
    expect(error.agentName).toBe("rule-agent");
    expect(error.message).toBe("rule-agent: failed to complete the request");
    expect(error.cause).toBe(cause);
  });
});
