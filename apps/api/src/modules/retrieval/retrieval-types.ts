import type { z } from "zod";

import type {
  RetrievalMatchSchema,
  RetrievalSearchRequestSchema,
  RetrievalSearchResponseSchema,
} from "./retrieval-schema";

export type RetrievalSearchRawRequestBody = z.input<
  typeof RetrievalSearchRequestSchema
>;

export type RetrievalSearchRequestBody = z.output<
  typeof RetrievalSearchRequestSchema
>;

export type RetrievalMatch = z.infer<typeof RetrievalMatchSchema>;

export type RetrievalSearchResponseBody = z.infer<
  typeof RetrievalSearchResponseSchema
>;
