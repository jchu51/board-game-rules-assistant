import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { AgentError } from "../src/agents/agent-error.js";

describe("AgentError", () => {
  it("wraps failed agent runs with the agent name and cause", () => {
    const cause = new Error("model failed");
    const error = AgentError.runFailed("rule-agent", cause);

    assert.equal(error.name, "AgentError");
    assert.equal(error.agentName, "rule-agent");
    assert.equal(error.message, "rule-agent: failed to complete the request");
    assert.equal(error.cause, cause);
  });
});
