import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Document } from "@langchain/core/documents";
import type { EmbeddingsInterface } from "@langchain/core/embeddings";
import type {
  RuleAnswerAgent,
  RuleContextAgent,
} from "@board-game-rules-assistant/agent-core";
import {
  LangchainMemoryVectorStore,
  type RulebookDocument,
  type RulebookDocumentInterface,
  type VectorStore,
  type VectorStoreSimilaritySearchInput,
} from "@board-game-rules-assistant/rag-core";

import { RequestClassifierService } from "../src/application/retrieval/request-classifier-service";
import { RetrievalService } from "../src/application/retrieval/retrieval-service";

class KeywordEmbeddings implements EmbeddingsInterface {
  private readonly terms = ["city", "resources", "road", "infection"];

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

    return vector.some((value) => value > 0)
      ? vector
      : [0.001, 0.001, 0.001, 0.001];
  }
}

class RecordingVectorStore implements VectorStore {
  readonly searches: VectorStoreSimilaritySearchInput[] = [];

  async upsert(): Promise<void> {}

  async similaritySearch(
    input: VectorStoreSimilaritySearchInput,
  ): Promise<RulebookDocumentInterface[]> {
    this.searches.push(input);
    return [];
  }
}

const createRulebookDocument = (
  pageContent: string,
  metadata: RulebookDocument["metadata"],
): RulebookDocumentInterface =>
  new Document({
    pageContent,
    metadata,
  }) as RulebookDocumentInterface;

const createVectorStore = async (
  documents: RulebookDocumentInterface[] = [],
) => {
  const vectorStore = new LangchainMemoryVectorStore(new KeywordEmbeddings());

  if (documents.length > 0) {
    await vectorStore.upsert(documents as RulebookDocument[]);
  }

  return vectorStore;
};

describe("RetrievalService", () => {
  it("returns a not-found answer when vector search has no matches", async () => {
    let createdAgent = false;
    const vectorStore = await createVectorStore();
    const service = new RetrievalService(
      vectorStore,
      new RequestClassifierService(),
      () => {
        createdAgent = true;
        throw new Error("should not create context agent");
      },
      () => {
        createdAgent = true;
        throw new Error("should not create answer agent");
      },
    );

    const result = await service.search({
      query: "How many resources does a city produce?",
    });

    assert.equal(createdAgent, false);
    assert.deepEqual(result.matches, []);
    assert.match(result.answer, /could not find relevant rulebook context/i);
  });

  it("skips RAG for out-of-scope requests", async () => {
    const vectorStore = new RecordingVectorStore();
    const service = new RetrievalService(
      vectorStore,
      new RequestClassifierService(),
      () => {
        throw new Error("should not create context agent");
      },
      () => {
        throw new Error("should not create answer agent");
      },
    );

    const result = await service.search({
      query: "What is the weather tomorrow?",
    });

    assert.equal(vectorStore.searches.length, 0);
    assert.deepEqual(result.matches, []);
    assert.match(result.answer, /only answer board-game rules questions/i);
  });

  it("uses context and answer agents after formatting retrieved matches", async () => {
    let contextAgentInput = "";
    let answerAgentContext = "";
    let answerAgentQuestion = "";
    const vectorStore = await createVectorStore([
      createRulebookDocument("Cities produce two resources.", {
        documentId: "11111111-1111-4111-8111-111111111111",
        loc: { pageNumber: 3 },
        source: "catan.pdf",
      }),
    ]);
    const service = new RetrievalService(
      vectorStore,
      new RequestClassifierService(),
      (context) => {
        contextAgentInput = context;
        return {
          async run() {
            return "Relevant rule: Cities produce two resources.";
          },
        } as unknown as RuleContextAgent;
      },
      (context) => {
        answerAgentContext = context;
        return {
          async run(question: string) {
            answerAgentQuestion = question;
            return "A city produces two resources.";
          },
        } as unknown as RuleAnswerAgent;
      },
    );

    const result = await service.search({
      query: "How many resources does a city produce?",
    });

    assert.match(contextAgentInput, /Chunk 1/);
    assert.match(contextAgentInput, /source=catan\.pdf/);
    assert.match(contextAgentInput, /page=3/);
    assert.match(contextAgentInput, /Cities produce two resources/);
    assert.equal(
      answerAgentContext,
      "Relevant rule: Cities produce two resources.",
    );
    assert.equal(
      answerAgentQuestion,
      "How many resources does a city produce?",
    );
    assert.deepEqual(result, {
      answer: "A city produces two resources.",
      matches: [
        {
          content: "Cities produce two resources.",
          metadata: {
            documentId: "11111111-1111-4111-8111-111111111111",
            pageNumber: 3,
            source: "catan.pdf",
          },
        },
      ],
    });
  });
});
