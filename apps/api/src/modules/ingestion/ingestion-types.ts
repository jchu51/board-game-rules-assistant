import { z } from "zod";

export const IngestionSplitterParamsSchema = z.object({
  chunkSize: z.number().int().positive(),
  chunkOverlap: z.number().int().nonnegative(),
});

export type IngestionSplitterParams = z.infer<
  typeof IngestionSplitterParamsSchema
>;

export type IngestionServiceOptions = {
  defaultSplitterParams: IngestionSplitterParams;
  uploadDirectory: string;
  maxUploadSizeBytes: number;
};

export type IngestPdfInput = {
  filePath: string;
  splitterParams?: Partial<IngestionSplitterParams>;
};

const nonEmptyTrimmedString = z.string().trim().min(1);

const SplitterParamsInputSchema =
  IngestionSplitterParamsSchema.partial().refine(
    (params) =>
      params.chunkSize === undefined ||
      params.chunkOverlap === undefined ||
      params.chunkOverlap < params.chunkSize,
    { message: "chunkOverlap must be less than chunkSize" },
  );

export const UploadPdfsRequestSchema = z
  .object({
    filePath: nonEmptyTrimmedString.optional(),
    files: nonEmptyTrimmedString.optional(),
    splitterParams: SplitterParamsInputSchema.optional(),
  })
  .transform((body, ctx) => {
    if (body.filePath && body.files) {
      ctx.addIssue({
        code: "custom",
        message: "Provide either filePath or files, not both",
        path: ["filePath"],
      });
      return z.NEVER;
    }

    const filePath = body.filePath ?? body.files;

    if (!filePath) {
      ctx.addIssue({
        code: "custom",
        message: "filePath is required",
        path: ["filePath"],
      });
      return z.NEVER;
    }

    return { filePath, splitterParams: body.splitterParams };
  });

export type UploadPdfsRequestBody = z.infer<typeof UploadPdfsRequestSchema>;

export const IngestionResultSchema = z.object({
  documentCount: z.number().int().nonnegative(),
  chunkCount: z.number().int().nonnegative(),
});

export type IngestionResult = z.infer<typeof IngestionResultSchema>;

export const UploadPdfsResponseSchema = IngestionResultSchema.extend({
  status: z.literal("completed"),
});

export type UploadPdfsResponseBody = z.infer<typeof UploadPdfsResponseSchema>;
