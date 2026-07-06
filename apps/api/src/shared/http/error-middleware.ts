import type { ErrorRequestHandler } from "express";

import { config } from "../../config/config.js";
import { HttpStatus } from "./http-status.js";

export const errorMiddleware: ErrorRequestHandler = (
  error,
  _request,
  response,
  next,
) => {
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
