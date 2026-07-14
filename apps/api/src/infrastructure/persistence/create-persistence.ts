import {
  LangchainMemoryVectorStore,
  type VectorStore,
} from "@board-game-rules-assistant/rag-core";
import type { EmbeddingsInterface } from "@langchain/core/embeddings";

import type { Config } from "../../config/config-types";
import type { ConversationRepository } from "../../domain/conversation/conversation-repository";
import type { RulebookRepository } from "../../domain/rulebook/rulebook-repository";
import { createPostgresPersistence } from "../database/persistence";
import { InMemoryConversationRepository } from "./conversation/in-memory-conversation-repository";
import { PostgresConversationRepository } from "./conversation/postgres-conversation-repository";
import { InMemoryRulebookRepository } from "./rulebook/in-memory-rulebook-repository";
import { PostgresRulebookRepository } from "./rulebook/postgres-rulebook-repository";

export type Persistence = {
  conversationRepository: ConversationRepository;
  rulebookRepository: RulebookRepository;
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
      rulebookRepository: new InMemoryRulebookRepository(),
      vectorStore: new LangchainMemoryVectorStore(embeddings),
      async healthCheck() {},
      async close() {},
    };
  }

  const databaseUrl = config.persistence.databaseUrl;
  if (!databaseUrl) {
    throw new Error("PostgreSQL persistence requires a database URL");
  }

  const postgresPersistence = await createPostgresPersistence({
    databaseUrl,
    embeddings,
  });

  return {
    conversationRepository: new PostgresConversationRepository(
      postgresPersistence.pool,
      {
        maxMessagesPerConversation:
          config.persistence.maxMessagesPerConversation,
      },
    ),
    rulebookRepository: new PostgresRulebookRepository(
      postgresPersistence.pool,
    ),
    vectorStore: postgresPersistence.vectorStore,
    healthCheck: postgresPersistence.healthCheck,
    close: postgresPersistence.close,
  };
};
