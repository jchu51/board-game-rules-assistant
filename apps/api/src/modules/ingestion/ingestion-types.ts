import type { z } from "zod";
import type { RulebookChunkMetadata } from "@board-game-rules-assistant/rag-core";

import type {
  IngestionResultSchema,
  IngestionSplitterParamsSchema,
  ListRulebooksResponseSchema,
  RulebookSummarySchema,
  UploadPdfsRequestSchema,
  UploadPdfsResponseSchema,
} from "./ingestion-schema";

export type IngestionSplitterParams = z.infer<
  typeof IngestionSplitterParamsSchema
>;

export type IngestionServiceOptions = {
  defaultSplitterParams: IngestionSplitterParams;
};

export type IngestPdfInput = {
  filePath: string;
  metadata?: Partial<RulebookChunkMetadata>;
  source?: string;
  splitterParams?: Partial<IngestionSplitterParams>;
};

export type UploadPdfsRawRequestBody = z.input<typeof UploadPdfsRequestSchema>;

export type UploadPdfsRequestBody = z.output<typeof UploadPdfsRequestSchema>;

export type IngestionResult = z.infer<typeof IngestionResultSchema>;

export type UploadPdfsResponseBody = z.infer<typeof UploadPdfsResponseSchema>;

export type RulebookSummary = z.infer<typeof RulebookSummarySchema>;

export type ListRulebooksResponseBody = z.infer<
  typeof ListRulebooksResponseSchema
>;

export type IngestionRouterOptions = {
  uploadDirectory: string;
  maxUploadSizeBytes: number;
  isProduction: boolean;
};
