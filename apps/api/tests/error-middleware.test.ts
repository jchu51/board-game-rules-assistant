import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";
import type {
  ErrorRequestHandler,
  NextFunction,
  Request,
  Response,
} from "express";

import { createErrorMiddleware } from "../src/presentation/http/shared/error-middleware";
import { testConfig } from "./test-config";

type CapturedResponse = {
  body?: unknown;
  statusCode?: number;
};

const createMockResponse = (
  captured: CapturedResponse,
  headersSent = false,
): Response =>
  ({
    headersSent,
    json(body: unknown) {
      captured.body = body;
      return this;
    },
    status(statusCode: number) {
      captured.statusCode = statusCode;
      return this;
    },
  }) as Response;

const invokeMiddleware = (
  middleware: ErrorRequestHandler,
  error: unknown,
  response: Response,
  next: NextFunction = () => {},
) => {
  middleware(error, {} as Request, response, next);
};

describe("createErrorMiddleware", () => {
  it("returns a production-safe error body", () => {
    const captured: CapturedResponse = {};
    const errorMock = mock.method(console, "error", () => {});

    try {
      invokeMiddleware(
        createErrorMiddleware({
          ...testConfig,
          nodeEnv: "production",
        }),
        new Error("sensitive failure"),
        createMockResponse(captured),
      );
    } finally {
      errorMock.mock.restore();
    }

    assert.equal(captured.statusCode, 500);
    assert.deepEqual(captured.body, {
      error: "Internal Server Error",
    });
  });

  it("includes error details outside production", () => {
    const captured: CapturedResponse = {};
    const errorMock = mock.method(console, "error", () => {});

    try {
      invokeMiddleware(
        createErrorMiddleware(testConfig),
        new Error("visible failure"),
        createMockResponse(captured),
      );
    } finally {
      errorMock.mock.restore();
    }

    assert.equal(captured.statusCode, 500);
    assert.match((captured.body as { error: string }).error, /visible failure/);
    assert.match((captured.body as { stack: string }).stack, /visible failure/);
  });

  it("delegates when headers were already sent", () => {
    const captured: CapturedResponse = {};
    const error = new Error("late failure");
    let nextError: unknown;
    const errorMock = mock.method(console, "error", () => {});

    try {
      invokeMiddleware(
        createErrorMiddleware(testConfig),
        error,
        createMockResponse(captured, true),
        (nextValue) => {
          nextError = nextValue;
        },
      );
    } finally {
      errorMock.mock.restore();
    }

    assert.equal(nextError, error);
    assert.deepEqual(captured, {});
  });
});
