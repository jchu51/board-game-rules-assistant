import { describe, expect, it } from "vitest";

import { EnvSchema } from "../src/config/config-schema";

describe("EnvSchema", () => {
  it("applies defaults while requiring the API keys", () => {
    const env = EnvSchema.parse({
      OPENAI_API_KEY: "test-key",
      TAVILY_API_KEY: "test-tavily-key",
    });

    expect(env.NODE_ENV).toBe("local");
    expect(env.HOST).toBe("127.0.0.1");
    expect(env.PORT).toBe(8000);
    expect(env.CORS_ORIGIN).toBe("http://localhost:5173");
    expect(env.AGENT_CHAT_MODEL).toBe("openai:gpt-4o-mini");
    expect(env.INGESTION_EMBEDDING_MODEL).toBe("text-embedding-3-large");
    expect(env.INGESTION_CHUNK_SIZE).toBe(500);
    expect(env.INGESTION_CHUNK_OVERLAP).toBe(100);
    expect(env.INGESTION_MAX_UPLOAD_SIZE_BYTES).toBe(40 * 1024 * 1024);
    expect(env.TAVILY_API_KEY).toBe("test-tavily-key");
    expect(env.PERSISTENCE_DRIVER).toBe("memory");
    expect(env.PERSISTENCE_MAX_MESSAGES).toBe(20);
  });

  it("requires a database URL for PostgreSQL persistence", () => {
    const result = EnvSchema.safeParse({
      OPENAI_API_KEY: "test-key",
      TAVILY_API_KEY: "test-tavily-key",
      PERSISTENCE_DRIVER: "postgres",
    });

    expect(result.success).toBe(false);
  });

  it("rejects memory persistence in production", () => {
    const result = EnvSchema.safeParse({
      NODE_ENV: "production",
      OPENAI_API_KEY: "test-key",
      TAVILY_API_KEY: "test-tavily-key",
      PERSISTENCE_DRIVER: "memory",
    });

    expect(result.success).toBe(false);
  });

  it("accepts positive PostgreSQL persistence settings", () => {
    const env = EnvSchema.parse({
      OPENAI_API_KEY: "test-key",
      TAVILY_API_KEY: "test-tavily-key",
      PERSISTENCE_DRIVER: "postgres",
      DATABASE_URL: "postgresql://localhost/rules",
      PERSISTENCE_MAX_MESSAGES: "7",
    });

    expect(env.DATABASE_URL).toBe("postgresql://localhost/rules");
    expect(env.PERSISTENCE_MAX_MESSAGES).toBe(7);
  });

  it("rejects a missing Tavily API key", () => {
    const result = EnvSchema.safeParse({
      OPENAI_API_KEY: "test-key",
    });

    expect(result.success).toBe(false);
  });

  it("rejects an empty Tavily API key", () => {
    const result = EnvSchema.safeParse({
      OPENAI_API_KEY: "test-key",
      TAVILY_API_KEY: "",
    });

    expect(result.success).toBe(false);
  });

  it("rejects an empty OpenAI API key", () => {
    const result = EnvSchema.safeParse({
      OPENAI_API_KEY: "",
      TAVILY_API_KEY: "test-tavily-key",
    });

    expect(result.success).toBe(false);
  });

  it("treats blank public search include domains as unset", () => {
    const env = EnvSchema.parse({
      OPENAI_API_KEY: "test-key",
      TAVILY_API_KEY: "test-tavily-key",
      PUBLIC_SEARCH_INCLUDE_DOMAINS: "",
    });

    expect(env.PUBLIC_SEARCH_INCLUDE_DOMAINS).toBe(undefined);
  });
});
