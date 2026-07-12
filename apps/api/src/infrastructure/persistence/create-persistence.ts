import {
  createPostgresPersistence,
  type PostgresPersistence,
} from "@board-game-rules-assistant/database";
import {
  LangchainMemoryVectorStore,
  type VectorStore,
} from "@board-game-rules-assistant/rag-core";
import type { EmbeddingsInterface } from "@langchain/core/embeddings";

import type { Config } from "../../config/config-types";
import type { ConversationRepository } from "../../domain/conversation/conversation-repository";
import { InMemoryConversationRepository } from "./conversation/in-memory-conversation-repository";

export type Persistence = {
  conversationRepository: ConversationRepository;
  vectorStore: VectorStore;
  healthCheck(): Promise<void>;
  close(): Promise<void>;
};

type CreatePersistenceOptions = {
  config: Config;
  embeddings: EmbeddingsInterface;
};

export const createPersistence = async ({
  config,
  embeddings,
}: CreatePersistenceOptions): Promise<Persistence> => {
  if (config.persistence.driver === "memory") {
    return {
      conversationRepository: new InMemoryConversationRepository({
        maxMessagesPerConversation:
          config.persistence.maxMessagesPerConversation,
      }),
      vectorStore: new LangchainMemoryVectorStore(embeddings),
      async healthCheck() {},
      async close() {},
    };
  }

  const databaseUrl = config.persistence.databaseUrl;
  if (!databaseUrl) {
    throw new Error("PostgreSQL persistence requires a database URL");
  }

  return (await createPostgresPersistence({
    databaseUrl,
    embeddings,
    maxMessagesPerConversation:
      config.persistence.maxMessagesPerConversation,
  })) as PostgresPersistence;
};
