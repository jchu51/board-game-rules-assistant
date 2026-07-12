import type { EmbeddingsInterface } from "@langchain/core/embeddings";
import { describe, expect, it } from "vitest";

import type { Config } from "../src/config/config-types";
import { createPersistence } from "../src/infrastructure/persistence/create-persistence";

const embeddings: EmbeddingsInterface = {
  async embedDocuments(values) {
    return values.map(() => [1, 0, 0]);
  },
  async embedQuery() {
    return [1, 0, 0];
  },
};

const baseConfig: Config = {
  nodeEnv: "test",
  host: "127.0.0.1",
  port: 8000,
  corsOrigin: "http://localhost:5173",
  agent: { chatModel: "openai:test" },
  ingestion: {
    openAiApiKey: "key",
    embeddingModel: "embedding",
    defaultChunkSize: 500,
    defaultChunkOverlap: 100,
    uploadDirectory: "/tmp",
    maxUploadSizeBytes: 1024,
  },
  publicSearch: { tavilyApiKey: "tavily" },
  persistence: {
    driver: "memory",
    maxMessagesPerConversation: 3,
  },
};

describe("createPersistence", () => {
  it("creates a working in-memory persistence bundle", async () => {
    const persistence = await createPersistence({
      config: baseConfig,
      embeddings,
    });

    await persistence.conversationRepository.appendMessages("conversation", [
      { role: "user", content: "one" },
      { role: "assistant", content: "two" },
      { role: "user", content: "three" },
      { role: "assistant", content: "four" },
    ]);

    expect(
      await persistence.conversationRepository.getMessages("conversation"),
    ).toHaveLength(3);
    await expect(persistence.healthCheck()).resolves.toBeUndefined();
    await expect(persistence.close()).resolves.toBeUndefined();
  });
});
