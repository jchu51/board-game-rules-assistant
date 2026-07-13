import type { ConfigurableModel } from "langchain/chat_models/universal";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { AgentRuntime } from "../src/agents/agent.js";
import { AgentError } from "../src/agents/agent-error.js";
import { ConversationMetadataAgent } from "../src/agents/conversation-metadata-agent.js";

const fakeModel = {} as ConfigurableModel;

afterEach(() => {
  vi.restoreAllMocks();
});

const runtimeWithText = (text: string): AgentRuntime => ({
  async invoke() {
    return { messages: [{ text }] };
  },
});

describe("ConversationMetadataAgent", () => {
  it("parses concise conversation metadata", async () => {
    const agent = new ConversationMetadataAgent(
      "conversation-metadata-agent",
      fakeModel,
      runtimeWithText('{"title":"Catan city production","game":"Catan"}'),
    );

    await expect(
      agent.run("How many resources does a Catan city make?"),
    ).resolves.toEqual({
      title: "Catan city production",
      game: "Catan",
    });
  });

  it.each(["Unknown", " unknown ", "   "])(
    "normalizes an unresolved %j game to null",
    async (game) => {
      const agent = new ConversationMetadataAgent(
        "conversation-metadata-agent",
        fakeModel,
        runtimeWithText(JSON.stringify({ title: "Trading question", game })),
      );

      await expect(agent.run("Can I trade this?")).resolves.toEqual({
        title: "Trading question",
        game: null,
      });
    },
  );

  it("accepts JSON inside a Markdown fence", async () => {
    const agent = new ConversationMetadataAgent(
      "conversation-metadata-agent",
      fakeModel,
      runtimeWithText(
        '```json\n{"title":"Pandemic outbreaks","game":"Pandemic"}\n```',
      ),
    );

    await expect(agent.run("How do outbreaks work?")).resolves.toEqual({
      title: "Pandemic outbreaks",
      game: "Pandemic",
    });
  });

  it.each([
    ["malformed JSON", "not json"],
    ["an empty title", '{"title":" ","game":"Catan"}'],
    ["a non-string game", '{"title":"Catan cities","game":42}'],
  ])("wraps %s as an AgentError", async (_case, text) => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const agent = new ConversationMetadataAgent(
      "conversation-metadata-agent",
      fakeModel,
      runtimeWithText(text),
    );

    await expect(agent.run("question")).rejects.toMatchObject({
      name: "AgentError",
      agentName: "conversation-metadata-agent",
    });
    await expect(agent.run("question")).rejects.toBeInstanceOf(AgentError);
  });
});
