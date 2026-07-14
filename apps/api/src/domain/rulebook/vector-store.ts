import type { RulebookChunk } from "./rulebook-chunk";

export type VectorStoreFilter = (chunk: RulebookChunk) => boolean;

export type VectorStoreSimilaritySearchInput = {
  filter?: VectorStoreFilter;
  query: string;
  topK?: number;
};

export interface VectorStore {
  upsert(records: RulebookChunk[]): Promise<void>;
  deleteByDocumentId(documentId: string): Promise<void>;
  similaritySearch(
    input: VectorStoreSimilaritySearchInput,
  ): Promise<RulebookChunk[]>;
  similaritySearchVectorWithScore(
    input: VectorStoreSimilaritySearchInput,
  ): Promise<[RulebookChunk, number][]>;
}
