import type { z } from "zod";

import type {
  IngestionResultSchema,
  IngestionSplitterParamsSchema,
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
  splitterParams?: Partial<IngestionSplitterParams>;
};

export type UploadPdfsRawRequestBody = z.input<typeof UploadPdfsRequestSchema>;

export type UploadPdfsRequestBody = z.output<typeof UploadPdfsRequestSchema>;

export type IngestionResult = z.infer<typeof IngestionResultSchema>;

export type UploadPdfsResponseBody = z.infer<typeof UploadPdfsResponseSchema>;

export type IngestionRouterOptions = {
  uploadDirectory: string;
  maxUploadSizeBytes: number;
  isProduction: boolean;
};
