import { describe, expect, it } from "vitest";

import {
  RetrievalSearchRequestSchema,
  RetrievalSearchResponseSchema,
} from "../src/presentation/http/retrieval/retrieval-schema";

describe("Retrieval schemas", () => {
  it("trims valid search requests and rejects extra fields", () => {
    expect(
      RetrievalSearchRequestSchema.parse({
        conversationId: "11111111-1111-4111-8111-111111111111",
        query: "  How many resources does a city produce?  ",
      }),
    ).toEqual({
      conversationId: "11111111-1111-4111-8111-111111111111",
      query: "How many resources does a city produce?",
    });

    const result = RetrievalSearchRequestSchema.safeParse({
      conversationId: "11111111-1111-4111-8111-111111111111",
      query: "How many resources does a city produce?",
      topK: 10,
    });

    expect(result.success).toBe(false);

    expect(
      RetrievalSearchRequestSchema.safeParse({
        conversationId: "not-a-uuid",
        query: "How many resources does a city produce?",
      }).success,
    ).toBe(false);
    expect(
      RetrievalSearchRequestSchema.safeParse({
        query: "How many resources does a city produce?",
      }).success,
    ).toBe(false);
  });

  it("validates answer responses with retrieval match metadata", () => {
    const response = RetrievalSearchResponseSchema.parse({
      answer: "A city produces two resources.",
      matches: [
        {
          origin: "rulebook",
          content: "Cities produce two resources.",
          metadata: {
            documentId: "11111111-1111-4111-8111-111111111111",
            pageNumber: 3,
            source: "catan.pdf",
          },
        },
      ],
    });

    expect(response.answer).toBe("A city produces two resources.");
    expect(response.matches[0]?.origin).toBe("rulebook");
    expect(response.matches[0]?.metadata.pageNumber).toBe(3);
  });
});
