import type { ConfigurableModel } from "langchain/chat_models/universal";
import { describe, expect, it, vi } from "vitest";

const {
  createAgent,
  invoke,
  piiMiddleware,
  createMiddleware,
  middlewareInstance,
  backstopInstance,
} = vi.hoisted(() => ({
  createAgent: vi.fn(),
  invoke: vi.fn(),
  piiMiddleware: vi.fn(),
  createMiddleware: vi.fn(),
  middlewareInstance: { name: "pii" },
  backstopInstance: { name: "policy-backstop" },
}));

vi.mock("langchain", () => ({
  createAgent,
  piiMiddleware,
  createMiddleware,
}));

import { RuleContextAgent } from "../../src/infrastructure/agents/rule-context-agent";

describe("RuleContextAgent default runtime", () => {
  it("redacts built-in PII types from the raw user question before it reaches the model", () => {
    const model = {} as ConfigurableModel;
    piiMiddleware.mockReturnValue(middlewareInstance);
    createMiddleware.mockReturnValue(backstopInstance);
    createAgent.mockReturnValue({ invoke });

    new RuleContextAgent("rule-context-agent", model, "context");

    const inputPiiOptions = {
      strategy: "redact",
      applyToInput: true,
      applyToOutput: false,
    };
    expect(piiMiddleware).toHaveBeenCalledWith("email", inputPiiOptions);
    expect(piiMiddleware).toHaveBeenCalledWith("credit_card", inputPiiOptions);
    expect(piiMiddleware).toHaveBeenCalledWith("ip", inputPiiOptions);
    expect(piiMiddleware).toHaveBeenCalledWith("mac_address", inputPiiOptions);
    expect(piiMiddleware).toHaveBeenCalledWith("url", inputPiiOptions);
    expect(createAgent).toHaveBeenCalledWith({
      model,
      middleware: [
        backstopInstance,
        middlewareInstance,
        middlewareInstance,
        middlewareInstance,
        middlewareInstance,
        middlewareInstance,
      ],
    });
  });
});
