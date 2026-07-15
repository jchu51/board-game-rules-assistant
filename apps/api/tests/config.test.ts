import { afterEach, describe, expect, it, vi } from "vitest";

const validEnvironment = {
  NODE_ENV: "test",
  HOST: "127.0.0.1",
  PORT: "8000",
  CORS_ORIGIN: "http://localhost:5173",
  AGENT_CHAT_MODEL: "openai:test",
  OPENAI_API_KEY: "key",
  INGESTION_EMBEDDING_MODEL: "embedding",
  INGESTION_CHUNK_SIZE: "500",
  INGESTION_CHUNK_OVERLAP: "50",
  INGESTION_UPLOAD_DIRECTORY: "/tmp",
  INGESTION_MAX_UPLOAD_SIZE_BYTES: "1024",
  TAVILY_API_KEY: "tavily",
  PERSISTENCE_DRIVER: "memory",
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.resetModules();
});

describe("config", () => {
  it("maps environment values and public search domains", async () => {
    for (const [name, value] of Object.entries({
      ...validEnvironment,
      PUBLIC_SEARCH_INCLUDE_DOMAINS: " catan.com, , boardgamegeek.com ",
    })) {
      vi.stubEnv(name, value);
    }

    const { config } = await import("../src/config/config");

    expect(config).toMatchObject({
      nodeEnv: "test",
      host: "127.0.0.1",
      port: 8000,
      publicSearch: {
        tavilyApiKey: "tavily",
        includeDomains: ["catan.com", "boardgamegeek.com"],
      },
      persistence: {
        driver: "memory",
        maxMessagesPerConversation: 20,
      },
    });
  });

  it("maps PostgreSQL persistence settings", async () => {
    for (const [name, value] of Object.entries({
      ...validEnvironment,
      PERSISTENCE_DRIVER: "postgres",
      DATABASE_URL: "postgresql://localhost/rules",
      PERSISTENCE_MAX_MESSAGES: "9",
    })) {
      vi.stubEnv(name, value);
    }

    const { config } = await import("../src/config/config");

    expect(config.persistence).toEqual({
      driver: "postgres",
      databaseUrl: "postgresql://localhost/rules",
      maxMessagesPerConversation: 9,
    });
  });

  it("supports omitted public search domains", async () => {
    for (const [name, value] of Object.entries(validEnvironment)) {
      vi.stubEnv(name, value);
    }
    vi.stubEnv("PUBLIC_SEARCH_INCLUDE_DOMAINS", "");

    const { config } = await import("../src/config/config");

    expect(config.publicSearch.includeDomains).toBeUndefined();
  });

  it("reports invalid configuration before exiting", async () => {
    vi.stubEnv("TAVILY_API_KEY", "tavily");
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.stubEnv("AGENT_CHAT_MODEL", "openai:gpt-4o-mini");
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("exit called");
    });

    await expect(import("../src/config/config")).rejects.toThrow("exit called");
    expect(error).toHaveBeenCalledWith("Invalid environment configuration:");
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining("OPENAI_API_KEY"),
    );
  });
});
