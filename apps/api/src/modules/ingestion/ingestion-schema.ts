import { z } from "zod";

export const IngestionSplitterParamsSchema = z.object({
  chunkSize: z.number().int().positive(),
  chunkOverlap: z.number().int().nonnegative(),
});

const SplitterParamsInputSchema = z
  .object({
    gameName: z.string().trim().min(1, "gameName is required"),
    chunkSize: z.coerce.number().int().positive().optional(),
    chunkOverlap: z.coerce.number().int().nonnegative().optional(),
  })
  .strict()
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
      gameName: body.gameName,
      splitterParams:
        Object.keys(splitterParams).length > 0 ? splitterParams : undefined,
    };
  },
);

export const IngestionResultSchema = z.object({
  documentCount: z.number().int().nonnegative(),
  chunkCount: z.number().int().nonnegative(),
});

export const RulebookSummarySchema = z.object({
  id: z.string().uuid(),
  gameName: z.string().min(1),
  pdfName: z.string().min(1),
  fileSize: z.number().int().nonnegative(),
});

export const ListRulebooksResponseSchema = z.object({
  rulebooks: z.array(RulebookSummarySchema),
});

export const UploadPdfsResponseSchema = IngestionResultSchema.extend({
  id: z.string().uuid(),
  gameName: z.string().min(1),
  pdfName: z.string().min(1),
  fileSize: z.number().int().nonnegative(),
  status: z.literal("completed"),
});
