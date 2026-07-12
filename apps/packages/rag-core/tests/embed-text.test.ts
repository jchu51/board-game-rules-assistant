import { describe, expect, it } from "vitest";

import { createOpenAIEmbeddings } from "../src/embeddings/embed-text.js";

describe("createOpenAIEmbeddings", () => {
  it("configures the requested model without embedding text", () => {
    const embeddings = createOpenAIEmbeddings("text-embedding-3-small", {
      apiKey: "test-api-key",
    });

    expect(embeddings.model).toBe("text-embedding-3-small");
    expect(embeddings.modelName).toBe("text-embedding-3-small");
  });
});
