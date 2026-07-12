import assert from "node:assert/strict";
import { test } from "node:test";
import { createCleanPostgresTestDatabase, getRetainedCleanupErrors, type SqlClient } from "./support/clean-postgres-test-database";

const client = (input: { unsafe?: () => Promise<unknown>; end: () => Promise<void> }): SqlClient => ({
  unsafe: input.unsafe ?? (async () => undefined),
  end: input.end,
});

test("create failure closes admin exactly once and preserves the primary error", async () => {
  const primary = new Error("create failed");
  const cleanup = new Error("end failed");
  let endCalls = 0;
  const admin = client({ unsafe: async () => { throw primary; }, end: async () => { endCalls++; throw cleanup; } });

  const caught = await createCleanPostgresTestDatabase({
    baseUrl: "postgres://test:test@localhost/test",
    connect: () => admin,
    migrate: async () => undefined,
    databaseName: "unique_create_failure",
  }).catch((error: unknown) => error);

  assert.equal(caught, primary);
  assert.equal(endCalls, 1);
  assert.deepEqual(getRetainedCleanupErrors(primary), [cleanup]);
});

test("drop failure still closes admin exactly once and preserves the drop error", async () => {
  const dropFailure = new Error("drop failed");
  let endCalls = 0;
  let connectCalls = 0;
  const admin = client({
    unsafe: async () => { if (connectCalls > 1) throw dropFailure; },
    end: async () => { endCalls++; },
  });
  const migration = client({ end: async () => undefined });

  const database = await createCleanPostgresTestDatabase({
    baseUrl: "postgres://test:test@localhost/test",
    connect: () => (++connectCalls === 1 ? admin : migration),
    migrate: async () => undefined,
    databaseName: "unique_drop_failure",
  });
  const caught = await database.dispose().catch((error: unknown) => error);

  assert.equal(caught, dropFailure);
  assert.equal(endCalls, 1);
});
