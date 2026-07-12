import { describe, expect, it, vi } from "vitest";
import type { ConfigurableModel } from "langchain/chat_models/universal";

const { createAgent, invoke } = vi.hoisted(() => ({
  createAgent: vi.fn(),
  invoke: vi.fn(),
}));

vi.mock("langchain", () => ({ createAgent }));

import { createLangChainAgentRuntime } from "../src/agents/agent.js";

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

    expect(createAgent).toHaveBeenCalledWith({ model });
    expect(invoke).toHaveBeenCalledWith({ messages });
    expect(response).toEqual({
      messages: [{ text: "First" }, { text: "Cities score points." }],
    });
  });
});
