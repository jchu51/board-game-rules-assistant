import type { ConfigurableModel } from "langchain/chat_models/universal";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { AgentRuntime } from "../../src/infrastructure/agents/agent";
import { AgentError } from "../../src/infrastructure/agents/agent-error";
import { ConversationTitleAgent } from "../../src/infrastructure/agents/conversation-title-agent";

const fakeModel = {} as ConfigurableModel;

afterEach(() => {
  vi.restoreAllMocks();
});

const runtimeWithText = (text: string): AgentRuntime => ({
  async invoke() {
    return { messages: [{ text }] };
  },
});

describe("ConversationTitleAgent", () => {
  it("parses a concise conversation title", async () => {
    const agent = new ConversationTitleAgent(
      "conversation-title-agent",
      fakeModel,
      runtimeWithText('{"title":"Catan city production"}'),
    );

    await expect(
      agent.run("How many resources does a Catan city make?"),
    ).resolves.toBe("Catan city production");
  });

  it("accepts JSON inside a Markdown fence", async () => {
    const agent = new ConversationTitleAgent(
      "conversation-title-agent",
      fakeModel,
      runtimeWithText('```json\n{"title":"Pandemic outbreaks"}\n```'),
    );

    await expect(agent.run("How do outbreaks work?")).resolves.toBe(
      "Pandemic outbreaks",
    );
  });

  it.each([
    ["malformed JSON", "not json"],
    ["an empty title", '{"title":" "}'],
    ["an extra property", '{"title":"Catan cities","game":"Catan"}'],
  ])("wraps %s as an AgentError", async (_case, text) => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const agent = new ConversationTitleAgent(
      "conversation-title-agent",
      fakeModel,
      runtimeWithText(text),
    );

    await expect(agent.run("question")).rejects.toMatchObject({
      name: "AgentError",
      agentName: "conversation-title-agent",
    });
    await expect(agent.run("question")).rejects.toBeInstanceOf(AgentError);
  });
});
