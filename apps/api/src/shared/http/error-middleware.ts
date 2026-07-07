import type { ErrorRequestHandler } from "express";

import type { Config } from "../../config/config-types";
import { HttpStatus } from "./http-status";

export const createErrorMiddleware =
  (config: Config): ErrorRequestHandler =>
  (error, _request, response, next) => {
    console.error(error);

    if (response.headersSent) {
      return next(error);
    }

    if (config.nodeEnv === "production") {
      response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        error: "Internal Server Error",
      });
      return;
    }

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: error instanceof Error ? error.message : "Internal Server Error",
      stack: error instanceof Error ? error.stack : undefined,
    });
  };
