import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import type { EmbeddingsInterface } from "@langchain/core/embeddings";
import type {
  VectorStore,
  VectorStoreSimilaritySearchInput,
} from "../../../domain/rulebook/vector-store.js";
import type { RulebookDocument } from "../documents/rulebook-document.js";

export class LangchainMemoryVectorStore implements VectorStore {
  readonly vectorStore: MemoryVectorStore;

  constructor(embeddings: EmbeddingsInterface) {
    this.vectorStore = new MemoryVectorStore(embeddings);
  }

  async upsert(records: RulebookDocument[]): Promise<void> {
    await this.vectorStore.addDocuments(records);
  }

  async deleteByDocumentId(documentId: string): Promise<void> {
    this.vectorStore.memoryVectors = this.vectorStore.memoryVectors.filter(
      (record) => record.metadata.documentId !== documentId,
    );
  }

  async similaritySearch(
    input: VectorStoreSimilaritySearchInput,
  ): Promise<RulebookDocument[]> {
    return this.vectorStore.similaritySearch(
      input.query,
      input.topK,
      input.filter,
    );
  }

  async similaritySearchVectorWithScore(
    input: VectorStoreSimilaritySearchInput,
  ): Promise<[RulebookDocument, number][]> {
    return this.vectorStore.similaritySearchWithScore(
      input.query,
      input.topK,
      input.filter,
    );
  }
}
