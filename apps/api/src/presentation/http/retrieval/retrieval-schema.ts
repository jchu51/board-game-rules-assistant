import { z } from "zod";

import { CONTEXT_ORIGINS } from "@board-game-rules-assistant/agent-core";

export const RetrievalSearchRequestSchema = z
  .object({
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
    answer: z.string(),
    matches: z.array(RetrievalMatchSchema),
  })
  .strict();
