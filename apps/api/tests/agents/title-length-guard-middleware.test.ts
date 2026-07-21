import { describe, expect, it, vi } from "vitest";

const { createMiddleware } = vi.hoisted(() => ({
  createMiddleware: vi.fn((config: unknown) => config),
}));

vi.mock("langchain", () => ({ createMiddleware }));

import { titleLengthGuardMiddleware } from "../../src/infrastructure/agents/title-length-guard-middleware";

type AfterModelHook = (state: { messages: Array<{ text?: string }> }) => void;

const afterModelHook = (): AfterModelHook => {
  const middleware = titleLengthGuardMiddleware() as unknown as {
    afterModel: AfterModelHook;
  };

  return middleware.afterModel;
};

describe("titleLengthGuardMiddleware", () => {
  it("passes through a response within the length limit", () => {
    const afterModel = afterModelHook();

    expect(() =>
      afterModel({ messages: [{ text: '{"title":"Catan cities"}' }] }),
    ).not.toThrow();
  });

  it("throws when the raw response exceeds the length limit", () => {
    const afterModel = afterModelHook();
    const oversized = `{"title":"${"x".repeat(200)}"}`;

    expect(() => afterModel({ messages: [{ text: oversized }] })).toThrow(
      /exceeds 200 characters/,
    );
  });
});
