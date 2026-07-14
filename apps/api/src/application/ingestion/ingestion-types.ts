import type {
  RulebookChunk,
  RulebookChunkMetadata,
} from "../../domain/rulebook/rulebook-chunk";

export type IngestionSplitterParams = {
  chunkSize: number;
  chunkOverlap: number;
};

export type PdfLoader = (
  filePath: string,
  options?: { source?: string },
) => Promise<RulebookChunk[]>;

export type DocumentChunker = (
  documents: RulebookChunk[],
  splitterParams: IngestionSplitterParams,
) => Promise<RulebookChunk[]>;

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
