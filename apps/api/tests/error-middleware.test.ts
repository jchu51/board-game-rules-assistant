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
import { PlanLimitReachedError } from "../src/application/access/access-policy-service";
import { AuthenticationRequiredError, GuestSessionExpiredError, UnauthorizedResourceError } from "../src/domain/identity/actor";
import { DatabaseUnavailableError } from "@board-game-rules-assistant/database";

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
  for (const [error, statusCode, body] of [
    [new PlanLimitReachedError(3, 3), 403, { code: "PLAN_LIMIT_REACHED", currentUsage: 3, limit: 3 }],
    [new GuestSessionExpiredError(), 401, { code: "GUEST_SESSION_EXPIRED" }],
    [new AuthenticationRequiredError(), 401, { code: "AUTHENTICATION_REQUIRED" }],
    [new UnauthorizedResourceError(), 404, { code: "RESOURCE_NOT_FOUND" }],
    [new DatabaseUnavailableError(), 503, { code: "DATABASE_UNAVAILABLE" }],
  ] as const) {
    it(`maps ${error.name} to ${statusCode}`, () => {
      const captured: CapturedResponse = {};
      const errorMock = mock.method(console, "error", () => {});
      try { invokeMiddleware(createErrorMiddleware(testConfig), error, createMockResponse(captured)); }
      finally { errorMock.mock.restore(); }
      assert.equal(captured.statusCode, statusCode);
      assert.deepEqual(captured.body, body);
    });
  }
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
