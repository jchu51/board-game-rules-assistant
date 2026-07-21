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

import { ConversationTitleAgent } from "../../src/infrastructure/agents/conversation-title-agent";

describe("ConversationTitleAgent default runtime", () => {
  it("redacts built-in PII types on both the raw question and the generated title", () => {
    const model = {} as ConfigurableModel;
    piiMiddleware.mockReturnValue(middlewareInstance);
    createAgent.mockReturnValue({ invoke });

    new ConversationTitleAgent("conversation-title-agent", model);

    const bothPiiOptions = {
      strategy: "redact",
      applyToInput: true,
      applyToOutput: true,
    };
    expect(piiMiddleware).toHaveBeenCalledWith("email", bothPiiOptions);
    expect(piiMiddleware).toHaveBeenCalledWith("credit_card", bothPiiOptions);
    expect(piiMiddleware).toHaveBeenCalledWith("ip", bothPiiOptions);
    expect(piiMiddleware).toHaveBeenCalledWith("mac_address", bothPiiOptions);
    expect(piiMiddleware).toHaveBeenCalledWith("url", bothPiiOptions);
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
