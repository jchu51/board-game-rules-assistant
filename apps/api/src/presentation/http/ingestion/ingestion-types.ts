import type { z } from "zod";

import type {
  ListRulebooksResponseSchema,
  RulebookSummarySchema,
  UploadPdfsRequestSchema,
  UploadPdfsResponseSchema,
} from "./ingestion-schema";

export type UploadPdfsRawRequestBody = z.input<typeof UploadPdfsRequestSchema>;

export type UploadPdfsRequestBody = z.output<typeof UploadPdfsRequestSchema>;

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
