import { describe, expect, it } from "vitest";

import { createPostgresPersistence } from "../src/persistence.js";
import { createTestDatabase, KeywordEmbeddings } from "./test-database.js";

describe("createPostgresPersistence", () => {
  it("provides a healthy, idempotently closable persistence bundle", async () => {
    const database = await createTestDatabase();
    const persistence = await createPostgresPersistence({
      databaseUrl: database.pool.options.connectionString!,
      embeddings: new KeywordEmbeddings(),
      vectorTableName: `rulebook_vectors_${Date.now()}`,
    });

    await expect(persistence.pool.query("SELECT 1")).resolves.toMatchObject({
      rowCount: 1,
    });
    await expect(persistence.healthCheck()).resolves.toBeUndefined();
    await expect(persistence.close()).resolves.toBeUndefined();
    await expect(persistence.close()).resolves.toBeUndefined();
    await database.dispose();
  });
});
