import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { boardGameRuleMasterPrompt } from "../src/prompts/board-game-rule-master-prompt.js";
import { ruleContextPrompt } from "../src/prompts/rule-context-prompt.js";

const contentAsText = (content: unknown): string => {
  if (typeof content === "string") {
    return content;
  }

  return JSON.stringify(content);
};

describe("ruleContextPrompt", () => {
  it("formats the user question and retrieved context", async () => {
    const messages = await ruleContextPrompt.formatMessages({
      context: "Chunk 1: Cities produce two resources.",
      question: "How many resources does a city produce?",
    });

    assert.equal(messages.length, 1);

    const content = contentAsText(messages[0]?.content);

    assert.match(content, /Question: How many resources/);
    assert.match(content, /Retrieved chunks: Chunk 1/);
    assert.match(content, /rulebook chunks come from/);
    assert.match(content, /public_web chunks/);
    assert.match(content, /Remove irrelevant rules/);
  });
});

describe("boardGameRuleMasterPrompt", () => {
  it("formats system grounding instructions and the human question", async () => {
    const messages = await boardGameRuleMasterPrompt.formatMessages({
      context: "Page 3: Cities produce two resources.",
      question: "How many resources does a city produce?",
    });

    assert.equal(messages.length, 2);

    const systemContent = contentAsText(messages[0]?.content);
    const humanContent = contentAsText(messages[1]?.content);

    assert.match(systemContent, /using only the excerpts provided/);
    assert.match(
      systemContent,
      /rulebook: an excerpt from an officially uploaded rulebook/,
    );
    assert.match(systemContent, /public_web: a public web search result/);
    assert.match(systemContent, /Page 3: Cities produce two resources/);
    assert.equal(humanContent, "How many resources does a city produce?");
  });
});
