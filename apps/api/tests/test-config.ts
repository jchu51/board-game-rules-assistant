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
    embeddingProvider: "openai",
    embeddingModel: "text-embedding-3-large",
    ollamaBaseUrl: "http://127.0.0.1:11434",
    maxUploadSizeBytes: 40 * 1024 * 1024,
    openAiApiKey: "test-api-key",
    uploadDirectory: "/tmp",
  },
  nodeEnv: "test",
  port: 0,
  publicSearch: {
    tavilyApiKey: "test-tavily-key",
  },
};
