import type { VectorStore } from "@board-game-rules-assistant/rag-core";
import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";
import type { EmbeddingsInterface } from "@langchain/core/embeddings";
import { Pool } from "pg";

import { runMigrations } from "./migrations.js";
import {
  PostgresRulebookFileStore,
  type RulebookFileStore,
} from "./rulebook/rulebook-file-store.js";
import { LangchainPgVectorStoreAdapter } from "./vector/langchain-pg-vector-store.js";

export type CreatePostgresPersistenceOptions = {
  databaseUrl: string;
  embeddings: EmbeddingsInterface;
  vectorTableName?: string;
};

export type PostgresPersistence = {
  pool: Pool;
  rulebookFileStore: RulebookFileStore;
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
      pool,
      rulebookFileStore: new PostgresRulebookFileStore(pool),
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
