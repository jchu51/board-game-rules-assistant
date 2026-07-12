import { afterEach, describe, expect, it, vi } from "vitest";
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

afterEach(() => {
  vi.restoreAllMocks();
});

describe("createErrorMiddleware", () => {
  it("returns a production-safe error body", () => {
    const captured: CapturedResponse = {};
    vi.spyOn(console, "error").mockImplementation(() => {});

    invokeMiddleware(
      createErrorMiddleware({
        ...testConfig,
        nodeEnv: "production",
      }),
      new Error("sensitive failure"),
      createMockResponse(captured),
    );

    expect(captured.statusCode).toBe(500);
    expect(captured.body).toEqual({
      error: "Internal Server Error",
    });
  });

  it("includes error details outside production", () => {
    const captured: CapturedResponse = {};
    vi.spyOn(console, "error").mockImplementation(() => {});

    invokeMiddleware(
      createErrorMiddleware(testConfig),
      new Error("visible failure"),
      createMockResponse(captured),
    );

    expect(captured.statusCode).toBe(500);
    expect((captured.body as { error: string }).error).toMatch(
      /visible failure/,
    );
    expect((captured.body as { stack: string }).stack).toMatch(
      /visible failure/,
    );
  });

  it("delegates when headers were already sent", () => {
    const captured: CapturedResponse = {};
    const error = new Error("late failure");
    let nextError: unknown;
    vi.spyOn(console, "error").mockImplementation(() => {});

    invokeMiddleware(
      createErrorMiddleware(testConfig),
      error,
      createMockResponse(captured, true),
      (nextValue) => {
        nextError = nextValue;
      },
    );

    expect(nextError).toBe(error);
    expect(captured).toEqual({});
  });
});
