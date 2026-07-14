import type { NextFunction, Response } from "express";
import { Router } from "express";
import { RetrievalService } from "../../../application/retrieval/retrieval-service";
import { ConversationNotFoundError } from "../../../domain/conversation/conversation-errors";
import { HttpStatus } from "../shared/http-status";
import type {
  ErrorResponseBody,
  TypedRequestBody,
  TypedResponse,
} from "../shared/http-types";
import {
  RetrievalSearchRequestSchema,
  RetrievalSearchResponseSchema,
} from "./retrieval-schema";
import type {
  RetrievalSearchRawRequestBody,
  RetrievalSearchResponseBody,
} from "./retrieval-types";

type RetrievalSearchRequest = TypedRequestBody<RetrievalSearchRawRequestBody>;
type RetrievalSearchResponse = TypedResponse<
  RetrievalSearchResponseBody | ErrorResponseBody
>;

export class RetrievalRouter {
  readonly router: Router;

  constructor(private readonly retrievalService: RetrievalService) {
    const router = Router();

    router.post("/retrieval/search", this.search);

    this.router = router;
  }

  private sendError = (response: Response, status: HttpStatus, error: string) =>
    response.status(status).json({ error });

  private search = async (
    request: RetrievalSearchRequest,
    response: RetrievalSearchResponse,
    next: NextFunction,
  ) => {
    try {
      const parseResult = RetrievalSearchRequestSchema.safeParse(request.body);

      if (!parseResult.success) {
        return this.sendError(
          response,
          HttpStatus.BAD_REQUEST,
          parseResult.error.issues[0]?.message ?? "Invalid request body",
        );
      }

      const result = await this.retrievalService.search(parseResult.data);
      const responseBody = RetrievalSearchResponseSchema.parse(result);

      return response.status(HttpStatus.OK).json(responseBody);
    } catch (error) {
      if (error instanceof ConversationNotFoundError) {
        return this.sendError(
          response,
          HttpStatus.NOT_FOUND,
          "Conversation not found",
        );
      }

      next(error);
    }
  };
}
