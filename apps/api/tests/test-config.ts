import type { Config } from "../src/config/config-types";

export const testConfig: Config = {
  agent: {
    chatModel: "openai:gpt-4o-mini",
  },
  corsOrigin: "http://localhost:5173",
  host: "127.0.0.1",
  ingestion: {
    defaultChunkOverlap: 100,
    defaultChunkSize: 500,
    embeddingModel: "text-embedding-3-large",
    embeddingDimensions: 3072,
    maxUploadSizeBytes: 40 * 1024 * 1024,
    openAiApiKey: "test-api-key",
    uploadDirectory: "/tmp",
  },
  nodeEnv: "test",
  localUserId: "11111111-1111-4111-8111-111111111111",
  port: 0,
  persistence: {
    driver: "memory",
  },
  publicSearch: {
    tavilyApiKey: "test-tavily-key",
  },
};
