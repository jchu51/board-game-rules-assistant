import { describe, expect, it } from "vitest";

import { RequestClassifierService } from "../src/application/retrieval/request-classifier-service";

describe("RequestClassifierService", () => {
  it("classifies board-game rules questions as searchable", () => {
    const classifier = new RequestClassifierService();

    expect(
      classifier.classify("  How many resources does a city produce?  "),
    ).toEqual({
      isGameRuleQuestion: true,
      normalizedQuery: "How many resources does a city produce?",
      reason: "board_game_rule",
    });
    expect(
      classifier.classify("Can I build a road in Catan?").isGameRuleQuestion,
    ).toBe(true);
    expect(
      classifier.classify("Is it legal to build a road in Catan?")
        .isGameRuleQuestion,
    ).toBe(true);
    expect(
      classifier.classify("What is the hand limit in Catan?")
        .isGameRuleQuestion,
    ).toBe(true);
    expect(
      classifier.classify("how to play Cluedo board game?").isGameRuleQuestion,
    ).toBe(true);
    expect(
      classifier.classify("how to play everdell ?").isGameRuleQuestion,
    ).toBe(true);
    expect(
      classifier.classify("Can I trade sheep in Catan?").isGameRuleQuestion,
    ).toBe(true);
    expect(
      classifier.classify("Who plays first when we roll the same number?")
        .isGameRuleQuestion,
    ).toBe(true);
  });

  it("classifies unrelated requests as out of scope", () => {
    const classifier = new RequestClassifierService();

    expect(classifier.classify("What is the weather tomorrow?")).toEqual({
      isGameRuleQuestion: false,
      normalizedQuery: "What is the weather tomorrow?",
      reason: "out_of_scope",
    });
    expect(
      classifier.classify("How do I upload a PDF?").isGameRuleQuestion,
    ).toBe(false);
    expect(
      classifier.classify("How do I open a browser window?").isGameRuleQuestion,
    ).toBe(false);
    expect(
      classifier.classify("How do I deal with stress?").isGameRuleQuestion,
    ).toBe(false);
    expect(
      classifier.classify("How do I play the guitar?").isGameRuleQuestion,
    ).toBe(false);
  });
});
