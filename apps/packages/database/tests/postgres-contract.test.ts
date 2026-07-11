import { createPostgresPersistence } from "../src/index.js";
import { runPersistenceContract } from "./contract-suite.js";
import {
  createPostgresTestDatabase,
  DeterministicEmbeddings,
} from "./postgres-test-database.js";

runPersistenceContract("postgres persistence", async () => {
  const testDatabase = await createPostgresTestDatabase();
  const persistence = await createPostgresPersistence({
    databaseUrl: testDatabase.databaseUrl,
    embeddings: new DeterministicEmbeddings(),
    expectedDimensions: 3072,
  });
  return { ...persistence, close: testDatabase.dispose };
});
