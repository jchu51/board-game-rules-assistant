import type { ConfigurableModel } from "langchain/chat_models/universal";
import { describe, expect, it, vi } from "vitest";

const { createAgent, invoke, piiMiddleware, middlewareInstance } = vi.hoisted(
  () => ({
    createAgent: vi.fn(),
    invoke: vi.fn(),
    piiMiddleware: vi.fn(),
    middlewareInstance: { name: "pii" },
  }),
);

vi.mock("langchain", () => ({
  createAgent,
  piiMiddleware,
}));

import { RuleContextAgent } from "../../src/infrastructure/agents/rule-context-agent";

describe("RuleContextAgent default runtime", () => {
  it("redacts built-in PII types from the raw user question before it reaches the model", () => {
    const model = {} as ConfigurableModel;
    piiMiddleware.mockReturnValue(middlewareInstance);
    createAgent.mockReturnValue({ invoke });

    new RuleContextAgent("rule-context-agent", model, "context");

    expect(piiMiddleware).toHaveBeenCalledWith("email", {
      strategy: "redact",
    });
    expect(piiMiddleware).toHaveBeenCalledWith("credit_card", {
      strategy: "redact",
    });
    expect(piiMiddleware).toHaveBeenCalledWith("ip", { strategy: "redact" });
    expect(piiMiddleware).toHaveBeenCalledWith("mac_address", {
      strategy: "redact",
    });
    expect(piiMiddleware).toHaveBeenCalledWith("url", { strategy: "redact" });
    expect(createAgent).toHaveBeenCalledWith({
      model,
      middleware: [
        middlewareInstance,
        middlewareInstance,
        middlewareInstance,
        middlewareInstance,
        middlewareInstance,
      ],
    });
  });
});
