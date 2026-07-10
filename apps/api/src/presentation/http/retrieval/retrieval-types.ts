import type { z } from "zod";

import type {
  RetrievalMatch,
  RetrievalSearchResult,
} from "../../../application/retrieval/retrieval-types";
import type { RetrievalSearchRequestSchema } from "./retrieval-schema";

export type RetrievalSearchRawRequestBody = z.input<
  typeof RetrievalSearchRequestSchema
>;

export type RetrievalSearchRequestBody = z.output<
  typeof RetrievalSearchRequestSchema
>;

export type RetrievalSearchResponseBody = RetrievalSearchResult;

export type { RetrievalMatch };
