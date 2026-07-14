import { Document } from "@langchain/core/documents";
import { describe, expect, it } from "vitest";

import { createPostgresPersistence } from "../../src/infrastructure/database/persistence";
import type { RulebookDocument } from "../../src/infrastructure/rag/documents/rulebook-document";
import { createTestDatabase, KeywordEmbeddings } from "./test-database";

const createDocument = (
  pageContent: string,
  documentId: string,
): RulebookDocument =>
  new Document({ pageContent, metadata: { documentId } }) as RulebookDocument;

describe("LangchainPgVectorStoreAdapter", () => {
  it("round-trips metadata and orders unfiltered results by cosine similarity", async () => {
    const database = await createTestDatabase();
    const persistence = await createPostgresPersistence({
      databaseUrl: database.databaseUrl,
      embeddings: new KeywordEmbeddings(),
      vectorTableName: `rulebook_vectors_${Date.now()}`,
    });

    try {
      await persistence.vectorStore.upsert([
        createDocument("The longest road scores points.", "road-card"),
        createDocument("A city produces two resources.", "catan"),
      ]);

      const results = await persistence.vectorStore.similaritySearch({
        query: "resources",
        topK: 1,
      });
      const scored =
        await persistence.vectorStore.similaritySearchVectorWithScore({
          query: "resources",
          topK: 2,
        });

      expect(results[0]?.metadata.documentId).toBe("catan");
      expect(results[0]?.pageContent).toBe("A city produces two resources.");
      expect(scored[0]?.[0].metadata.documentId).toBe("catan");
      expect(scored[0]?.[1]).toBeGreaterThan(scored[1]?.[1] ?? 1);
    } finally {
      await persistence.close();
      await database.dispose();
    }
  });

  it("rejects callback filters explicitly", async () => {
    const database = await createTestDatabase();
    const persistence = await createPostgresPersistence({
      databaseUrl: database.databaseUrl,
      embeddings: new KeywordEmbeddings(),
      vectorTableName: `rulebook_vectors_${Date.now()}`,
    });

    try {
      await expect(
        persistence.vectorStore.similaritySearch({
          query: "resources",
          filter: () => true,
        }),
      ).rejects.toThrow(
        "PostgreSQL vector search does not support callback filters",
      );
    } finally {
      await persistence.close();
      await database.dispose();
    }
  });
});
