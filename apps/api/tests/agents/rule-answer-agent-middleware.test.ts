import type { ConfigurableModel } from "langchain/chat_models/universal";
import { describe, expect, it, vi } from "vitest";

const { createAgent, invoke, modelCallLimitMiddleware, middlewareInstance } =
  vi.hoisted(() => ({
    createAgent: vi.fn(),
    invoke: vi.fn(),
    modelCallLimitMiddleware: vi.fn(),
    middlewareInstance: { name: "model-call-limit" },
  }));

vi.mock("langchain", () => ({
  createAgent,
  modelCallLimitMiddleware,
}));

import { RuleAnswerAgent } from "../../src/infrastructure/agents/rule-answer-agent";

describe("RuleAnswerAgent default runtime", () => {
  it("bounds model calls with a run-level limit that errors on breach", () => {
    const model = {} as ConfigurableModel;
    modelCallLimitMiddleware.mockReturnValue(middlewareInstance);
    createAgent.mockReturnValue({ invoke });

    new RuleAnswerAgent("rule-answer-agent", model, "context");

    expect(modelCallLimitMiddleware).toHaveBeenCalledWith({
      runLimit: 3,
      exitBehavior: "error",
    });
    expect(createAgent).toHaveBeenCalledWith({
      model,
      middleware: [middlewareInstance],
    });
  });
});
