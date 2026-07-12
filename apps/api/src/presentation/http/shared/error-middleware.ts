import type { ErrorRequestHandler } from "express";

import type { Config } from "../../../config/config-types";
import { getErrorMessage } from "./get-error-message";
import { HttpStatus } from "./http-status";
import { DatabaseUnavailableError, PersistenceNotFoundError } from "@board-game-rules-assistant/database";
import { AdminRequiredError, PlanLimitReachedError } from "../../../application/access/access-policy-service";
import { ActorResolutionError, AuthenticationRequiredError, GuestSessionExpiredError, UnauthorizedResourceError } from "../../../domain/identity/actor";
import { InvalidLibraryTransitionError } from "../../../application/library/library-service";

export const createErrorMiddleware =
  (config: Config): ErrorRequestHandler =>
  (error, _request, response, next) => {
    console.error(error);

    if (response.headersSent) {
      return next(error);
    }

    if (error instanceof PlanLimitReachedError) {
      response.status(HttpStatus.FORBIDDEN).json({ code: error.code, currentUsage: error.currentUsage, limit: error.limit });
      return;
    }
    if (error instanceof AdminRequiredError) {
      response.status(HttpStatus.FORBIDDEN).json({ code: error.code });
      return;
    }
    if (error instanceof InvalidLibraryTransitionError) {
      response.status(HttpStatus.CONFLICT).json({ code: error.code });
      return;
    }
    if (error instanceof GuestSessionExpiredError || error instanceof ActorResolutionError || error instanceof AuthenticationRequiredError) {
      response.status(HttpStatus.UNAUTHORIZED).json({ code: error.code });
      return;
    }
    if (error instanceof UnauthorizedResourceError || error instanceof PersistenceNotFoundError) {
      response.status(HttpStatus.NOT_FOUND).json({ code: "RESOURCE_NOT_FOUND" });
      return;
    }
    if (error instanceof DatabaseUnavailableError) {
      response.status(HttpStatus.SERVICE_UNAVAILABLE).json({ code: error.code });
      return;
    }

    if (config.nodeEnv === "production") {
      response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        error: "Internal Server Error",
      });
      return;
    }

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: getErrorMessage(error, "Internal Server Error"),
      stack: error instanceof Error ? error.stack : undefined,
    });
  };
