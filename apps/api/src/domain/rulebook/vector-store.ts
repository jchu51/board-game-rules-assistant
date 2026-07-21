import type { RulebookChunk } from "./rulebook-chunk";

export type VectorStoreFilter = (chunk: RulebookChunk) => boolean;

export type VectorStoreSimilaritySearchInput = {
  filter?: VectorStoreFilter;
  query: string;
  topK?: number;
};

export type VectorStoreMmrSearchInput = {
  filter?: VectorStoreFilter;
  query: string;
  topK?: number;
  /** Number of candidates fetched before applying MMR re-ranking. */
  fetchK?: number;
  /** 1 ranks purely by relevance, 0 purely by diversity. */
  lambda?: number;
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
  maxMarginalRelevanceSearch(
    input: VectorStoreMmrSearchInput,
  ): Promise<RulebookChunk[]>;
}
