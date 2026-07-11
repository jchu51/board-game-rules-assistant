import type { Callbacks } from "@langchain/core/callbacks/manager";
import type {
  RulebookDocument,
  RulebookDocumentInterface,
} from "../documents/rulebook-document.js";

export type VectorStoreScope = {
  gameId: string;
  userId?: string;
};

export type VectorStoreSimilaritySearchInput = {
  callbacks?: Callbacks;
  query: string;
  topK: number;
  scope: VectorStoreScope;
};

export interface VectorStore {
  upsert(records: RulebookDocument[]): Promise<void>;
  similaritySearch(
    input: VectorStoreSimilaritySearchInput,
  ): Promise<RulebookDocumentInterface[]>;
  similaritySearchVectorWithScore(
    input: VectorStoreSimilaritySearchInput,
  ): Promise<[RulebookDocumentInterface, number][]>;
}
