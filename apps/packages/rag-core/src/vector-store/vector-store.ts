import type { Callbacks } from "@langchain/core/callbacks/manager";
import type {
  RulebookDocument,
  RulebookDocumentInterface,
} from "../documents/rulebook-document.js";

export type VectorStoreFilter = (document: RulebookDocument) => boolean;

export type VectorStoreSimilaritySearchInput = {
  callbacks?: Callbacks;
  filter?: VectorStoreFilter;
  query: string;
  topK?: number;
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
