import type { ConfigurableModel } from "langchain/chat_models/universal";
import { describe, expect, it, vi } from "vitest";

const { createAgent, invoke } = vi.hoisted(() => ({
  createAgent: vi.fn(),
  invoke: vi.fn(),
}));

vi.mock("langchain", () => ({ createAgent }));

import { createLangChainAgentRuntime } from "../../src/infrastructure/agents/agent";

describe("createLangChainAgentRuntime", () => {
  it("invokes LangChain and maps response messages to runtime text", async () => {
    const model = {} as ConfigurableModel;
    const messages = [{ role: "user", content: "How do cities score?" }];
    createAgent.mockReturnValue({ invoke });
    invoke.mockResolvedValue({
      messages: [{ text: "First" }, { text: "Cities score points." }],
    });

    const runtime = createLangChainAgentRuntime(model);
    const response = await runtime.invoke({ messages });

    expect(createAgent).toHaveBeenCalledWith({ model, middleware: [] });
    expect(invoke).toHaveBeenCalledWith({ messages });
    expect(response).toEqual({
      messages: [{ text: "First" }, { text: "Cities score points." }],
    });
  });

  it("passes provided middleware through to LangChain", () => {
    const model = {} as ConfigurableModel;
    const middleware = [{ name: "fake-middleware" }] as never;
    createAgent.mockReturnValue({ invoke });

    createLangChainAgentRuntime(model, middleware);

    expect(createAgent).toHaveBeenCalledWith({ model, middleware });
  });
});
