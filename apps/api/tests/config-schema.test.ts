import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { EnvSchema } from "../src/config/config-schema";

describe("EnvSchema", () => {
  it("applies defaults while requiring an OpenAI API key", () => {
    const env = EnvSchema.parse({
      OPENAI_API_KEY: "test-key",
    });

    assert.equal(env.NODE_ENV, "local");
    assert.equal(env.HOST, "127.0.0.1");
    assert.equal(env.PORT, 8000);
    assert.equal(env.CORS_ORIGIN, "http://localhost:5173");
    assert.equal(env.AGENT_CHAT_MODEL, "openai:gpt-4o-mini");
    assert.equal(env.INGESTION_EMBEDDING_MODEL, "text-embedding-3-large");
    assert.equal(env.INGESTION_CHUNK_SIZE, 500);
    assert.equal(env.INGESTION_CHUNK_OVERLAP, 100);
    assert.equal(env.INGESTION_MAX_UPLOAD_SIZE_BYTES, 40 * 1024 * 1024);
    assert.equal(env.TAVILY_API_KEY, undefined);
  });

  it("accepts an optional Tavily API key", () => {
    const env = EnvSchema.parse({
      OPENAI_API_KEY: "test-key",
      TAVILY_API_KEY: "test-tavily-key",
    });

    assert.equal(env.TAVILY_API_KEY, "test-tavily-key");
  });

  it("rejects an empty OpenAI API key", () => {
    const result = EnvSchema.safeParse({
      OPENAI_API_KEY: "",
    });

    assert.equal(result.success, false);
  });
});
