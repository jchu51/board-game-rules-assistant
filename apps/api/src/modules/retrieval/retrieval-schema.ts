import { z } from "zod";

export const RetrievalSearchRequestSchema = z
  .object({
    query: z.string().trim().min(1, "query is required"),
    rulebookId: z.string().uuid().optional(),
    topK: z.coerce.number().int().positive().max(20).default(5),
  })
  .strict();

export const RetrievalMatchMetadataSchema = z
  .object({
    documentId: z.string().uuid().optional(),
    pageNumber: z.number().int().positive().optional(),
    source: z.string().optional(),
  })
  .strict();

export const RetrievalMatchSchema = z
  .object({
    content: z.string(),
    metadata: RetrievalMatchMetadataSchema,
  })
  .strict();

export const RetrievalSearchResponseSchema = z
  .object({
    matches: z.array(RetrievalMatchSchema),
  })
  .strict();
