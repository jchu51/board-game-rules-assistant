import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Document } from "@langchain/core/documents";
import type { EmbeddingsInterface } from "@langchain/core/embeddings";

import type { RulebookDocument } from "../src/documents/rulebook-document.js";
import { LangchainMemoryVectorStore } from "../src/vector-store/langchain-memory-vector-store.js";

class KeywordEmbeddings implements EmbeddingsInterface {
  private readonly terms = ["resource", "road", "infection"];

  async embedDocuments(documents: string[]): Promise<number[][]> {
    return documents.map((document) => this.embedText(document));
  }

  async embedQuery(document: string): Promise<number[]> {
    return this.embedText(document);
  }

  private embedText(text: string): number[] {
    const normalizedText = text.toLowerCase();
    const vector = this.terms.map((term) =>
      normalizedText.includes(term) ? 1 : 0,
    );

    return vector.some((value) => value > 0) ? vector : [0.001, 0.001, 0.001];
  }
}

const createDocument = (
  pageContent: string,
  documentId: string,
): RulebookDocument =>
  new Document({
    pageContent,
    metadata: { documentId },
  }) as RulebookDocument;

describe("LangchainMemoryVectorStore", () => {
  it("returns the most similar indexed rulebook document", async () => {
    const vectorStore = new LangchainMemoryVectorStore(new KeywordEmbeddings());

    await vectorStore.upsert([
      createDocument("A city produces two resources.", "catan"),
      createDocument("The longest road can score bonus points.", "road-card"),
      createDocument(
        "Increase the infection rate after an epidemic.",
        "pandemic",
      ),
    ]);

    const results = await vectorStore.similaritySearch({
      query: "How many resources does a city produce?",
      topK: 1,
    });

    assert.equal(results.length, 1);
    assert.equal(results[0]?.metadata.documentId, "catan");
    assert.equal(results[0]?.pageContent, "A city produces two resources.");
  });

  it("applies filters before returning similarity search results", async () => {
    const vectorStore = new LangchainMemoryVectorStore(new KeywordEmbeddings());

    await vectorStore.upsert([
      createDocument("A city produces two resources.", "catan"),
      createDocument(
        "Increase the infection rate after an epidemic.",
        "pandemic",
      ),
    ]);

    const results = await vectorStore.similaritySearch({
      filter: (document) => document.metadata.documentId === "pandemic",
      query: "How many resources does a city produce?",
      topK: 2,
    });

    assert.equal(results.length, 1);
    assert.equal(results[0]?.metadata.documentId, "pandemic");
  });
});
