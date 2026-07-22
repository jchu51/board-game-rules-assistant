import { describe, expect, it, vi } from "vitest";

const { createMiddleware } = vi.hoisted(() => ({
  createMiddleware: vi.fn((config: unknown) => config),
}));

vi.mock("langchain", () => ({ createMiddleware }));

import { policyBackstopMiddleware } from "../../src/infrastructure/agents/policy-backstop-middleware";

type BeforeAgentHook = (
  state: unknown,
  runtime: { context: { policyApproved: boolean } },
) => void;

const beforeAgentHook = (): BeforeAgentHook => {
  const middleware = policyBackstopMiddleware() as unknown as {
    beforeAgent: BeforeAgentHook;
  };

  return middleware.beforeAgent;
};

describe("policyBackstopMiddleware", () => {
  it("allows the agent invocation when the application marks the request as policy-approved", () => {
    const beforeAgent = beforeAgentHook();

    expect(() =>
      beforeAgent(undefined, { context: { policyApproved: true } }),
    ).not.toThrow();
  });

  it("rejects an agent invocation that was not marked policy-approved", () => {
    const beforeAgent = beforeAgentHook();

    expect(() =>
      beforeAgent(undefined, { context: { policyApproved: false } }),
    ).toThrow(/missing application policy approval/);
  });
});
