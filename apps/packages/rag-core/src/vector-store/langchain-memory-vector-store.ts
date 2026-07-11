import type { EmbeddingsInterface } from "@langchain/core/embeddings";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import type {
  RulebookDocument,
  RulebookDocumentInterface,
} from "../documents/rulebook-document.js";
import type {
  VectorStore,
  VectorStoreSimilaritySearchInput,
} from "./vector-store.js";

export class LangchainMemoryVectorStore implements VectorStore {
  readonly vectorStore: MemoryVectorStore;

  constructor(embeddings: EmbeddingsInterface) {
    this.vectorStore = new MemoryVectorStore(embeddings);
  }

  async upsert(records: RulebookDocument[]): Promise<void> {
    await this.vectorStore.addDocuments(records);
  }

  async similaritySearch(
    input: VectorStoreSimilaritySearchInput,
  ): Promise<RulebookDocumentInterface[]> {
    return this.vectorStore.similaritySearch(
      input.query,
      input.topK,
      (document) => this.isAuthorized(document as RulebookDocument, input),
      input.callbacks,
    );
  }

  async similaritySearchVectorWithScore(
    input: VectorStoreSimilaritySearchInput,
  ): Promise<[RulebookDocumentInterface, number][]> {
    return this.vectorStore.similaritySearchWithScore(
      input.query,
      input.topK,
      (document) => this.isAuthorized(document as RulebookDocument, input),
      input.callbacks,
    );
  }

  private isAuthorized(
    document: RulebookDocument,
    input: VectorStoreSimilaritySearchInput,
  ): boolean {
    const { metadata } = document;
    return (
      metadata.gameId === input.scope.gameId &&
      (metadata.visibility !== "private" ||
        (input.scope.userId !== undefined &&
          metadata.ownerUserId === input.scope.userId))
    );
  }
}
