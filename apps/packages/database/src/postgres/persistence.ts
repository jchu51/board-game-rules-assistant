import type { EmbeddingsInterface } from "@langchain/core/embeddings";

import type { Persistence } from "../domain/repositories.js";
import { createPostgresClient } from "./client.js";
import { checkPostgresHealth } from "./health.js";
import { createPostgresRepositories } from "./repositories.js";
import { PostgresVectorStore } from "./vector-store.js";
import { withPostgresErrorBoundary } from "./error-boundary.js";

export const createPostgresPersistence = async (input: {
  databaseUrl: string;
  embeddings: EmbeddingsInterface;
  expectedDimensions: number;
}): Promise<Persistence> => {
  const { db, sql } = createPostgresClient(input.databaseUrl);
  const repositories = createPostgresRepositories(db);
  return {
    identity: withPostgresErrorBoundary(repositories.identity),
    policies: withPostgresErrorBoundary(repositories.policies),
    library: withPostgresErrorBoundary(repositories.library),
    conversations: withPostgresErrorBoundary(repositories.conversations),
    vectorStore: withPostgresErrorBoundary(new PostgresVectorStore(db, input.embeddings)),
    healthCheck: () => checkPostgresHealth(db, input.expectedDimensions),
    close: () => sql.end(),
  };
};
