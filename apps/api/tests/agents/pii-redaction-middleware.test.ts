import { describe, expect, it, vi } from "vitest";

const { piiMiddleware } = vi.hoisted(() => ({
  piiMiddleware: vi.fn((piiType: string, options: unknown) => ({
    piiType,
    options,
  })),
}));

vi.mock("langchain", () => ({ piiMiddleware }));

import { piiRedactionMiddleware } from "../../src/infrastructure/agents/pii-redaction-middleware";

describe("piiRedactionMiddleware", () => {
  it("builds one redact-strategy middleware per built-in PII type", () => {
    const middleware = piiRedactionMiddleware({
      applyToInput: true,
      applyToOutput: false,
    });

    expect(middleware).toEqual([
      {
        piiType: "email",
        options: {
          strategy: "redact",
          applyToInput: true,
          applyToOutput: false,
        },
      },
      {
        piiType: "credit_card",
        options: {
          strategy: "redact",
          applyToInput: true,
          applyToOutput: false,
        },
      },
      {
        piiType: "ip",
        options: {
          strategy: "redact",
          applyToInput: true,
          applyToOutput: false,
        },
      },
      {
        piiType: "mac_address",
        options: {
          strategy: "redact",
          applyToInput: true,
          applyToOutput: false,
        },
      },
      {
        piiType: "url",
        options: {
          strategy: "redact",
          applyToInput: true,
          applyToOutput: false,
        },
      },
    ]);
  });
});
