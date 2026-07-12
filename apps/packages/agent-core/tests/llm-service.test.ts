import { describe, expect, it, vi } from "vitest";

const { initChatModel } = vi.hoisted(() => ({ initChatModel: vi.fn() }));
vi.mock("langchain", () => ({ initChatModel }));

import { LLMService } from "../src/llm/llm-service.js";

describe("LLMService", () => {
  it("applies default model options", async () => {
    initChatModel.mockResolvedValue("model");

    await expect(new LLMService().init("openai:test")).resolves.toBe("model");
    expect(initChatModel).toHaveBeenCalledWith("openai:test", {
      apiKey: undefined,
      temperature: 0.7,
      timeout: undefined,
      maxTokens: 10000,
      maxRetries: 6,
    });
  });

  it("forwards explicit model options", async () => {
    await new LLMService().init("openai:test", {
      apiKey: "key",
      temperature: 0,
      timeout: 500,
      maxTokens: 200,
      maxRetries: 0,
    });

    expect(initChatModel).toHaveBeenLastCalledWith("openai:test", {
      apiKey: "key",
      temperature: 0,
      timeout: 500,
      maxTokens: 200,
      maxRetries: 0,
    });
  });
});
