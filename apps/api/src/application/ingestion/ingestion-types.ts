import type { RulebookChunkMetadata } from "../../infrastructure/rag/documents/rulebook-document";

export type IngestionSplitterParams = {
  chunkSize: number;
  chunkOverlap: number;
};

export type IngestionServiceOptions = {
  defaultSplitterParams: IngestionSplitterParams;
};

export type IngestPdfInput = {
  filePath: string;
  metadata?: Partial<RulebookChunkMetadata>;
  source?: string;
  splitterParams?: Partial<IngestionSplitterParams>;
};

export type IngestionResult = {
  documentCount: number;
  chunkCount: number;
};
