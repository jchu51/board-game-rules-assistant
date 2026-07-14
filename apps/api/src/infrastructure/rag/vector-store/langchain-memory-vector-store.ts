import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import type { EmbeddingsInterface } from "@langchain/core/embeddings";
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

  async deleteByDocumentId(documentId: string): Promise<void> {
    this.vectorStore.memoryVectors = this.vectorStore.memoryVectors.filter(
      (record) => record.metadata.documentId !== documentId,
    );
  }

  async similaritySearch(
    input: VectorStoreSimilaritySearchInput,
  ): Promise<RulebookDocumentInterface[]> {
    return this.vectorStore.similaritySearch(
      input.query,
      input.topK,
      input.filter,
      input.callbacks,
    );
  }

  async similaritySearchVectorWithScore(
    input: VectorStoreSimilaritySearchInput,
  ): Promise<[RulebookDocumentInterface, number][]> {
    return this.vectorStore.similaritySearchWithScore(
      input.query,
      input.topK,
      input.filter,
      input.callbacks,
    );
  }
}
