import assert from "node:assert/strict";
import { test } from "node:test";

import { DatabaseUnavailableError, PersistenceNotFoundError } from "../src/domain/errors.js";
import { createPostgresPersistence } from "../src/postgres/persistence.js";
import { createPostgresTestDatabase, DeterministicEmbeddings } from "./postgres-test-database.js";

test("translates a closed PostgreSQL connection at the public repository boundary", async () => {
  const database = await createPostgresTestDatabase();
  const persistence = await createPostgresPersistence({
    databaseUrl: database.databaseUrl,
    embeddings: new DeterministicEmbeddings(),
    expectedDimensions: 3072,
  });
  await persistence.close();
  try {
    await assert.rejects(persistence.policies.getTierPolicy("standard"), (error: unknown) => {
      assert.ok(error instanceof DatabaseUnavailableError);
      assert.ok(error.cause);
      return true;
    });
  } finally {
    await database.dispose();
  }
});

test("does not translate PostgreSQL constraint errors into outages", async () => {
  const database = await createPostgresTestDatabase();
  const persistence = await createPostgresPersistence({
    databaseUrl: database.databaseUrl,
    embeddings: new DeterministicEmbeddings(),
    expectedDimensions: 3072,
  });
  try {
    const input = { email: "duplicate@example.com", displayName: "Duplicate", accountRole: "user" as const, planTier: "standard" as const };
    await persistence.identity.createUser(input);
    await assert.rejects(persistence.identity.createUser(input), (error: unknown) => {
      assert.equal(error instanceof DatabaseUnavailableError, false);
      assert.equal((error as { cause?: { code?: string } }).cause?.code, "23505");
      return true;
    });
    await assert.rejects(
      persistence.library.replaceActivePrivateVersion({ versionId: crypto.randomUUID(), userId: crypto.randomUUID(), chunkCount: 0 }),
      PersistenceNotFoundError,
    );
  } finally {
    await persistence.close();
    await database.dispose();
  }
});
