import { describe, expect, it } from "vitest";

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

    expect(messages.length).toBe(1);

    const content = contentAsText(messages[0]?.content);

    expect(content).toMatch(/Question: How many resources/);
    expect(content).toMatch(/Retrieved chunks: Chunk 1/);
    expect(content).toMatch(/rulebook chunks come from/);
    expect(content).toMatch(/public_web chunks/);
    expect(content).toMatch(/Remove irrelevant rules/);
  });
});

describe("boardGameRuleMasterPrompt", () => {
  it("formats system grounding instructions and the human question", async () => {
    const messages = await boardGameRuleMasterPrompt.formatMessages({
      context: "Page 3: Cities produce two resources.",
      question: "How many resources does a city produce?",
    });

    expect(messages.length).toBe(2);

    const systemContent = contentAsText(messages[0]?.content);
    const humanContent = contentAsText(messages[1]?.content);

    expect(systemContent).toMatch(
      /rulebook: an excerpt from an officially uploaded rulebook/,
    );
    expect(systemContent).toMatch(/using only the excerpts provided/);
    expect(systemContent).toMatch(/public_web: a public web search result/);
    expect(systemContent).toMatch(/Page 3: Cities produce two resources/);
    expect(humanContent).toBe("How many resources does a city produce?");
  });
});
