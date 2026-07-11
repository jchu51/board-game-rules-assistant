import type { EmbeddingsInterface } from "@langchain/core/embeddings";

import type { Persistence } from "./domain/repositories.js";
import { createMemoryPersistence } from "./memory/memory-database.js";
import { createPostgresPersistence } from "./postgres/persistence.js";

export type PersistenceDriver = "memory" | "postgres";

export const createPersistence = async (input: {
  driver: PersistenceDriver;
  nodeEnv: "local" | "development" | "test" | "production";
  databaseUrl?: string;
  embeddings: EmbeddingsInterface;
  expectedDimensions: number;
}): Promise<Persistence> => {
  if (input.nodeEnv === "production" && input.driver === "memory") {
    throw new Error("production requires postgres persistence");
  }

  if (input.driver === "memory") {
    return createMemoryPersistence();
  }

  if (!input.databaseUrl) {
    throw new Error("DATABASE_URL is required for postgres persistence");
  }

  return createPostgresPersistence({
    databaseUrl: input.databaseUrl,
    embeddings: input.embeddings,
    expectedDimensions: input.expectedDimensions,
  });
};
