import { describe, expect, it } from "vitest";

import {
  buildRestoredMessages,
  buildRetrievalAnswer,
  detectGame,
  getLastCitedMessage,
} from "./chat-helpers";

describe("chat helpers", () => {
  it("converts persisted messages into completed display messages", () => {
    expect(
      buildRestoredMessages("chat-a", [
        { role: "user", content: "Question" },
        { role: "assistant", content: "Answer" },
      ]),
    ).toEqual([
      { id: "history-chat-a-0", role: "user", text: "Question" },
      {
        id: "history-chat-a-1",
        role: "assistant",
        text: "Answer",
        cites: [],
        phase: "done",
        revealed: 6,
      },
    ]);
  });

  it("detects a named game case-insensitively", () => {
    expect(detectGame("How does CATAN trading work?")).toBe("Catan");
  });

  it("maps retrieval matches to citations", () => {
    const result = buildRetrievalAnswer("Catan city", {
      title: "Catan city production",
      answer: "A city produces two resources.",
      matches: [
        {
          origin: "rulebook",
          content: "Cities produce two resources.",
          metadata: { source: "catan.pdf", pageNumber: 8 },
        },
      ],
    });

    expect(result.cites).toEqual([
      {
        n: 1,
        book: "catan.pdf",
        page: 8,
        quote: "Cities produce two resources.",
      },
    ]);
    expect(result.text).toContain("Sources: [[1]]");
  });

  it("uses the fallback for an empty retrieval response", () => {
    expect(
      buildRetrievalAnswer("Unknown rule", {
        title: "Unknown rule",
        answer: "",
        matches: [],
      }).text,
    ).toContain("Try uploading the rulebook");
  });

  it("returns the last completed assistant message with citations", () => {
    expect(
      getLastCitedMessage([
        { id: "user", role: "user", text: "Question" },
        {
          id: "answer",
          role: "assistant",
          text: "Answer",
          cites: [{ n: 1, book: "Rules", quote: "Rule" }],
          phase: "done",
          revealed: 6,
        },
      ])?.id,
    ).toBe("answer");
  });
});
