import type { ConfigurableModel } from "langchain/chat_models/universal";
import { describe, expect, it, vi } from "vitest";

const {
  createAgent,
  invoke,
  modelCallLimitMiddleware,
  piiMiddleware,
  callLimitInstance,
  piiInstance,
} = vi.hoisted(() => ({
  createAgent: vi.fn(),
  invoke: vi.fn(),
  modelCallLimitMiddleware: vi.fn(),
  piiMiddleware: vi.fn(),
  callLimitInstance: { name: "model-call-limit" },
  piiInstance: { name: "pii" },
}));

vi.mock("langchain", () => ({
  createAgent,
  modelCallLimitMiddleware,
  piiMiddleware,
}));

import { RuleAnswerAgent } from "../../src/infrastructure/agents/rule-answer-agent";

describe("RuleAnswerAgent default runtime", () => {
  it("bounds model calls with a run-level limit that errors on breach", () => {
    const model = {} as ConfigurableModel;
    modelCallLimitMiddleware.mockReturnValue(callLimitInstance);
    piiMiddleware.mockReturnValue(piiInstance);
    createAgent.mockReturnValue({ invoke });

    new RuleAnswerAgent("rule-answer-agent", model, "context");

    expect(modelCallLimitMiddleware).toHaveBeenCalledWith({
      runLimit: 3,
      exitBehavior: "error",
    });
  });

  it("redacts built-in PII types from the answer before it is returned, without re-scanning input", () => {
    const model = {} as ConfigurableModel;
    modelCallLimitMiddleware.mockReturnValue(callLimitInstance);
    piiMiddleware.mockReturnValue(piiInstance);
    createAgent.mockReturnValue({ invoke });

    new RuleAnswerAgent("rule-answer-agent", model, "context");

    const outputPiiOptions = {
      strategy: "redact",
      applyToInput: false,
      applyToOutput: true,
    };
    expect(piiMiddleware).toHaveBeenCalledWith("email", outputPiiOptions);
    expect(piiMiddleware).toHaveBeenCalledWith("credit_card", outputPiiOptions);
    expect(piiMiddleware).toHaveBeenCalledWith("ip", outputPiiOptions);
    expect(piiMiddleware).toHaveBeenCalledWith("mac_address", outputPiiOptions);
    expect(piiMiddleware).toHaveBeenCalledWith("url", outputPiiOptions);
    expect(createAgent).toHaveBeenCalledWith({
      model,
      middleware: [
        callLimitInstance,
        piiInstance,
        piiInstance,
        piiInstance,
        piiInstance,
        piiInstance,
      ],
    });
  });
});
