import type {
  VectorStore,
  VectorStoreSimilaritySearchInput,
} from "../../../domain/rulebook/vector-store.js";
import type { RulebookDocument } from "../documents/rulebook-document.js";
import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";

const assertNoCallbackFilter = (
  input: VectorStoreSimilaritySearchInput,
): void => {
  if (input.filter) {
    throw new Error(
      "PostgreSQL vector search does not support callback filters",
    );
  }
};

export class LangchainPgVectorStoreAdapter implements VectorStore {
  constructor(readonly vectorStore: PGVectorStore) {}

  async upsert(records: RulebookDocument[]): Promise<void> {
    await this.vectorStore.addDocuments(records);
  }

  async deleteByDocumentId(documentId: string): Promise<void> {
    await this.vectorStore.delete({ filter: { documentId } });
  }

  async similaritySearch(
    input: VectorStoreSimilaritySearchInput,
  ): Promise<RulebookDocument[]> {
    assertNoCallbackFilter(input);
    return this.vectorStore.similaritySearch(input.query, input.topK);
  }

  async similaritySearchVectorWithScore(
    input: VectorStoreSimilaritySearchInput,
  ): Promise<[RulebookDocument, number][]> {
    assertNoCallbackFilter(input);
    const results = await this.vectorStore.similaritySearchWithScore(
      input.query,
      input.topK,
    );

    return results.map(([document, cosineDistance]) => [
      document,
      1 - cosineDistance,
    ]);
  }
}
