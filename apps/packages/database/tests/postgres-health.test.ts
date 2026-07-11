import assert from "node:assert/strict";
import { test } from "node:test";

import { DatabaseUnavailableError } from "../src/domain/errors.js";
import { createPostgresClient } from "../src/postgres/client.js";
import { checkPostgresHealth } from "../src/postgres/health.js";
import { createPostgresTestDatabase } from "./postgres-test-database.js";

test("health accepts the current migration state", async () => {
  const database = await createPostgresTestDatabase();
  const client = createPostgresClient(database.databaseUrl);
  try {
    await checkPostgresHealth(client.db, 3072);
  } finally {
    await client.sql.end();
    await database.dispose();
  }
});

test("health rejects an empty migration journal", async () => {
  const database = await createPostgresTestDatabase();
  const client = createPostgresClient(database.databaseUrl);
  try {
    await database.sql`delete from drizzle.__drizzle_migrations`;
    await assert.rejects(
      checkPostgresHealth(client.db, 3072),
      DatabaseUnavailableError,
    );
  } finally {
    await client.sql.end();
    await database.dispose();
  }
});

test("health rejects a stale migration journal", async () => {
  const database = await createPostgresTestDatabase();
  const client = createPostgresClient(database.databaseUrl);
  try {
    await database.sql`
      delete from drizzle.__drizzle_migrations
      where id = (select max(id) from drizzle.__drizzle_migrations)
    `;
    await assert.rejects(
      checkPostgresHealth(client.db, 3072),
      DatabaseUnavailableError,
    );
  } finally {
    await client.sql.end();
    await database.dispose();
  }
});
