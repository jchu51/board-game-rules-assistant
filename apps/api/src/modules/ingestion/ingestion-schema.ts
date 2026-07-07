import { z } from "zod";

export const IngestionSplitterParamsSchema = z.object({
  chunkSize: z.number().int().positive(),
  chunkOverlap: z.number().int().nonnegative(),
});

const SplitterParamsInputSchema = z
  .object({
    chunkSize: z.coerce.number().int().positive().optional(),
    chunkOverlap: z.coerce.number().int().nonnegative().optional(),
  })
  .refine(
    (params) =>
      params.chunkSize === undefined ||
      params.chunkOverlap === undefined ||
      params.chunkOverlap < params.chunkSize,
    { message: "chunkOverlap must be less than chunkSize" },
  );

export const UploadPdfsRequestSchema = SplitterParamsInputSchema.transform(
  (body) => {
    const splitterParams: { chunkSize?: number; chunkOverlap?: number } = {};

    if (body.chunkSize !== undefined) {
      splitterParams.chunkSize = body.chunkSize;
    }

    if (body.chunkOverlap !== undefined) {
      splitterParams.chunkOverlap = body.chunkOverlap;
    }

    return {
      splitterParams:
        Object.keys(splitterParams).length > 0 ? splitterParams : undefined,
    };
  },
);

export const IngestionResultSchema = z.object({
  documentCount: z.number().int().nonnegative(),
  chunkCount: z.number().int().nonnegative(),
});

export const UploadPdfsResponseSchema = IngestionResultSchema.extend({
  status: z.literal("completed"),
});
