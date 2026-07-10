import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";
import type { BaseMessageLike } from "@langchain/core/messages";
import type { ConfigurableModel } from "langchain/chat_models/universal";

import type { AgentRuntime } from "../src/agents/agent.js";
import { AgentError } from "../src/agents/agent-error.js";
import { RuleAnswerAgent } from "../src/agents/rule-answer-agent.js";
import { RuleContextAgent } from "../src/agents/rule-context-agent.js";

const fakeModel = {} as ConfigurableModel;

const contentAsText = (content: unknown): string => {
  if (typeof content === "string") {
    return content;
  }

  return JSON.stringify(content);
};

const messageContent = (
  messages: BaseMessageLike[],
  index: number,
): unknown => {
  const message = messages[index];

  if (typeof message === "string") {
    return message;
  }

  if (Array.isArray(message)) {
    return message[1];
  }

  if (message && "content" in message) {
    return message.content;
  }

  return undefined;
};

describe("RuleContextAgent", () => {
  it("runs the context prompt through the injected agent runtime", async () => {
    let promptText = "";
    const runtime: AgentRuntime = {
      async invoke({ messages }) {
        promptText = contentAsText(messageContent(messages, 0));

        return {
          messages: [{ text: "Cities produce two resources." }],
        };
      },
    };

    const agent = new RuleContextAgent(
      "rule-context-agent",
      fakeModel,
      "Chunk 1: Cities produce two resources.",
      runtime,
    );

    const result = await agent.run("How many resources does a city produce?");

    assert.equal(result, "Cities produce two resources.");
    assert.match(promptText, /Question: How many resources/);
    assert.match(promptText, /Retrieved chunks: Chunk 1/);
  });

  it("wraps runtime failures as AgentError", async () => {
    const cause = new Error("runtime failed");
    const runtime: AgentRuntime = {
      async invoke() {
        throw cause;
      },
    };
    const errorMock = mock.method(console, "error", () => {});
    const agent = new RuleContextAgent(
      "rule-context-agent",
      fakeModel,
      "context",
      runtime,
    );

    try {
      await assert.rejects(
        () => agent.run("question"),
        (error: unknown) => {
          assert.ok(error instanceof AgentError);
          assert.equal(error.agentName, "rule-context-agent");
          assert.equal(error.cause, cause);
          return true;
        },
      );
    } finally {
      errorMock.mock.restore();
    }
  });
});

describe("RuleAnswerAgent", () => {
  it("runs the answer prompt through the injected agent runtime", async () => {
    let systemPrompt = "";
    let humanPrompt = "";
    const runtime: AgentRuntime = {
      async invoke({ messages }) {
        systemPrompt = contentAsText(messageContent(messages, 0));
        humanPrompt = contentAsText(messageContent(messages, 1));

        return {
          messages: [{ text: "A city produces two resources." }],
        };
      },
    };

    const agent = new RuleAnswerAgent(
      "rule-answer-agent",
      fakeModel,
      "Page 3: Cities produce two resources.",
      runtime,
    );

    const result = await agent.run("How many resources does a city produce?");

    assert.equal(result, "A city produces two resources.");
    assert.match(systemPrompt, /Board Game Rule Master/);
    assert.match(systemPrompt, /Page 3: Cities produce two resources/);
    assert.equal(humanPrompt, "How many resources does a city produce?");
  });

  it("returns a fallback when the runtime response has no final text", async () => {
    const runtime: AgentRuntime = {
      async invoke() {
        return { messages: [{}] };
      },
    };
    const agent = new RuleAnswerAgent(
      "rule-answer-agent",
      fakeModel,
      "context",
      runtime,
    );

    const result = await agent.run("question");

    assert.equal(result, "No response");
  });
});
