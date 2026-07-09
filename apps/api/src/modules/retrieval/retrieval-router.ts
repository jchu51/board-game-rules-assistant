import type { NextFunction, Response } from "express";
import { Router } from "express";
import { HttpStatus } from "../../shared/http/http-status";
import type {
  ErrorResponseBody,
  TypedRequestBody,
  TypedResponse,
} from "../../shared/http/http-types";
import {
  RetrievalSearchRequestSchema,
  RetrievalSearchResponseSchema,
} from "./retrieval-schema";
import { RetrievalService } from "./retrieval-service";
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

      const matches = await this.retrievalService.search(parseResult.data);
      const responseBody = RetrievalSearchResponseSchema.parse({ matches });

      return response.status(HttpStatus.OK).json(responseBody);
    } catch (error) {
      next(error);
    }
  };
}
