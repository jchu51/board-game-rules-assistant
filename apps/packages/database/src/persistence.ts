import type { VectorStore } from "@board-game-rules-assistant/rag-core";
import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";
import type { EmbeddingsInterface } from "@langchain/core/embeddings";
import { Pool } from "pg";

import { PostgresConversationRepository } from "./conversation/postgres-conversation-repository.js";
import type { ConversationRepositoryLike } from "./conversation/conversation-types.js";
import { runMigrations } from "./migrations.js";
import { LangchainPgVectorStoreAdapter } from "./vector/langchain-pg-vector-store.js";

export type CreatePostgresPersistenceOptions = {
  databaseUrl: string;
  embeddings: EmbeddingsInterface;
  maxMessagesPerConversation?: number;
  vectorTableName?: string;
};

export type PostgresPersistence = {
  conversationRepository: ConversationRepositoryLike;
  vectorStore: VectorStore;
  healthCheck(): Promise<void>;
  close(): Promise<void>;
};

export const createPostgresPersistence = async (
  options: CreatePostgresPersistenceOptions,
): Promise<PostgresPersistence> => {
  const pool = new Pool({ connectionString: options.databaseUrl });

  try {
    await runMigrations(pool);
    const pgVectorStore = await PGVectorStore.initialize(options.embeddings, {
      pool,
      tableName: options.vectorTableName ?? "rulebook_vectors",
      distanceStrategy: "cosine",
      columns: {
        idColumnName: "id",
        vectorColumnName: "embedding",
        contentColumnName: "content",
        metadataColumnName: "metadata",
      },
    });
    let closePromise: Promise<void> | undefined;

    return {
      conversationRepository: new PostgresConversationRepository(pool, {
        maxMessagesPerConversation: options.maxMessagesPerConversation,
      }),
      vectorStore: new LangchainPgVectorStoreAdapter(pgVectorStore),
      async healthCheck() {
        await pool.query("SELECT 1");
        const result = await pool.query(
          "SELECT 1 FROM pg_extension WHERE extname = 'vector'",
        );
        if (result.rowCount !== 1) {
          throw new Error("PostgreSQL vector extension is not available");
        }
      },
      close() {
        closePromise ??= (async () => {
          pgVectorStore.client?.release();
          pgVectorStore.client = undefined;
          await pool.end();
        })();
        return closePromise;
      },
    };
  } catch (error) {
    await pool.end();
    throw error;
  }
};
