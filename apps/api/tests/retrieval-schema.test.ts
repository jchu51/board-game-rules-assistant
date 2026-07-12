import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  RetrievalSearchRequestSchema,
  RetrievalSearchResponseSchema,
} from "../src/presentation/http/retrieval/retrieval-schema";

describe("Retrieval schemas", () => {
  it("trims valid search requests and rejects extra fields", () => {
    assert.deepEqual(
      RetrievalSearchRequestSchema.parse({
        conversationId: "11111111-1111-4111-8111-111111111111",
        query: "  How many resources does a city produce?  ",
      }),
      {
        conversationId: "11111111-1111-4111-8111-111111111111",
        query: "How many resources does a city produce?",
      },
    );

    const result = RetrievalSearchRequestSchema.safeParse({
      conversationId: "11111111-1111-4111-8111-111111111111",
      gameId: "22222222-2222-4222-8222-222222222222",
      query: "How many resources does a city produce?",
      topK: 10,
    });

    assert.equal(result.success, false);

    assert.equal(
      RetrievalSearchRequestSchema.safeParse({
        conversationId: "not-a-uuid",
        query: "How many resources does a city produce?",
      }).success,
      false,
    );
    assert.equal(
      RetrievalSearchRequestSchema.safeParse({
        query: "How many resources does a city produce?",
      }).success,
      false,
    );
    for (const forbidden of ["gameId", "userId"] as const) {
      assert.equal(
        RetrievalSearchRequestSchema.safeParse({
          conversationId: "11111111-1111-4111-8111-111111111111",
          query: "Question",
          [forbidden]: "22222222-2222-4222-8222-222222222222",
        }).success,
        false,
      );
    }
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

    assert.equal(response.answer, "A city produces two resources.");
    assert.equal(response.matches[0]?.origin, "rulebook");
    assert.equal(response.matches[0]?.metadata.pageNumber, 3);
  });
});
