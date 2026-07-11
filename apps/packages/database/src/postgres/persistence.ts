import type { EmbeddingsInterface } from "@langchain/core/embeddings";

import type { Persistence } from "../domain/repositories.js";
import { createPostgresClient } from "./client.js";
import { checkPostgresHealth } from "./health.js";
import { createPostgresRepositories } from "./repositories.js";
import { PostgresVectorStore } from "./vector-store.js";

export const createPostgresPersistence = async (input: {
  databaseUrl: string;
  embeddings: EmbeddingsInterface;
  expectedDimensions: number;
}): Promise<Persistence> => {
  const { db, sql } = createPostgresClient(input.databaseUrl);
  const repositories = createPostgresRepositories(db);
  return {
    ...repositories,
    vectorStore: new PostgresVectorStore(db, input.embeddings),
    healthCheck: () => checkPostgresHealth(db, input.expectedDimensions),
    close: () => sql.end(),
  };
};
