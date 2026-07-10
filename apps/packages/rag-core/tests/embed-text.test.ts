import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createOpenAIEmbeddings } from "../src/embeddings/embed-text.js";

describe("createOpenAIEmbeddings", () => {
  it("configures the requested model without embedding text", () => {
    const embeddings = createOpenAIEmbeddings("text-embedding-3-small", {
      apiKey: "test-api-key",
    });

    assert.equal(embeddings.model, "text-embedding-3-small");
    assert.equal(embeddings.modelName, "text-embedding-3-small");
  });
});
