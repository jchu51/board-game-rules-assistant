import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { RequestClassifierService } from "../src/application/retrieval/request-classifier-service";

describe("RequestClassifierService", () => {
  it("classifies board-game rules questions as searchable", () => {
    const classifier = new RequestClassifierService();

    assert.deepEqual(
      classifier.classify("  How many resources does a city produce?  "),
      {
        isGameRuleQuestion: true,
        normalizedQuery: "How many resources does a city produce?",
        reason: "board_game_rule",
      },
    );
    assert.equal(
      classifier.classify("Can I build a road in Catan?").isGameRuleQuestion,
      true,
    );
    assert.equal(
      classifier.classify("Is it legal to build a road in Catan?")
        .isGameRuleQuestion,
      true,
    );
    assert.equal(
      classifier.classify("What is the hand limit in Catan?")
        .isGameRuleQuestion,
      true,
    );
    assert.equal(
      classifier.classify("how to play Cluedo board game?").isGameRuleQuestion,
      true,
    );
    assert.equal(
      classifier.classify("how to play everdell ?").isGameRuleQuestion,
      true,
    );
    assert.equal(
      classifier.classify("Can I trade sheep in Catan?").isGameRuleQuestion,
      true,
    );
    assert.equal(
      classifier.classify("Who plays first when we roll the same number?")
        .isGameRuleQuestion,
      true,
    );
  });

  it("classifies unrelated requests as out of scope", () => {
    const classifier = new RequestClassifierService();

    assert.deepEqual(classifier.classify("What is the weather tomorrow?"), {
      isGameRuleQuestion: false,
      normalizedQuery: "What is the weather tomorrow?",
      reason: "out_of_scope",
    });
    assert.equal(
      classifier.classify("How do I upload a PDF?").isGameRuleQuestion,
      false,
    );
    assert.equal(
      classifier.classify("How do I open a browser window?").isGameRuleQuestion,
      false,
    );
    assert.equal(
      classifier.classify("How do I deal with stress?").isGameRuleQuestion,
      false,
    );
    assert.equal(
      classifier.classify("How do I play the guitar?").isGameRuleQuestion,
      false,
    );
  });
});
