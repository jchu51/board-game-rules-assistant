import { describe } from "vitest";

import { PostgresConversationRepository } from "../src/conversation/postgres-conversation-repository.js";
import { runMigrations } from "../src/migrations.js";
import { runConversationRepositoryContract } from "./conversation-contract.js";
import { createTestDatabase } from "./test-database.js";

describe("PostgresConversationRepository", () => {
  runConversationRepositoryContract(async () => {
    const database = await createTestDatabase();
    await runMigrations(database.pool);

    return {
      repository: new PostgresConversationRepository(database.pool, {
        maxMessagesPerConversation: 3,
      }),
      dispose: database.dispose,
    };
  });
});
