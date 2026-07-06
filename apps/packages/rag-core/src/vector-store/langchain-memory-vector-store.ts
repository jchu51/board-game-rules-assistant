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

export const createLangChainMemoryVectorStore = (
  embeddings: EmbeddingsInterface,
): MemoryVectorStore => {
  return new MemoryVectorStore(embeddings);
};

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
      input.filter,
      input.callbacks,
    ) as Promise<RulebookDocumentInterface[]>;
  }
}
