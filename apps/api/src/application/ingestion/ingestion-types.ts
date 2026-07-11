import type { RulebookChunkMetadata } from "@board-game-rules-assistant/rag-core";
import type { Actor, DocumentKind } from "@board-game-rules-assistant/database";

export type IngestionSplitterParams = {
  chunkSize: number;
  chunkOverlap: number;
};

export type IngestionServiceOptions = {
  defaultSplitterParams: IngestionSplitterParams;
};

export type IngestPdfInput = {
  actor: Actor;
  gameId: string;
  title: string;
  kind: DocumentKind;
  documentId?: string;
  filePath: string;
  metadata?: Partial<RulebookChunkMetadata>;
  source?: string;
  splitterParams?: Partial<IngestionSplitterParams>;
};

export type IngestionResult = {
  documentCount: number;
  chunkCount: number;
};
