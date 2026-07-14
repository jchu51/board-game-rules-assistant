import { z } from "zod";

import { CONTEXT_ORIGINS } from "../../../infrastructure/agents/context-origin";

export const RetrievalSearchRequestSchema = z
  .object({
    conversationId: z.string().uuid("conversationId must be a valid UUID"),
    query: z.string().trim().min(1, "query is required"),
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
    origin: z.enum(CONTEXT_ORIGINS),
    content: z.string(),
    metadata: RetrievalMatchMetadataSchema,
  })
  .strict();

export const RetrievalSearchResponseSchema = z
  .object({
    title: z.string().min(1),
    answer: z.string(),
    matches: z.array(RetrievalMatchSchema),
  })
  .strict();
