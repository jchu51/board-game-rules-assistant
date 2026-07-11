import assert from "node:assert/strict";
import test from "node:test";

import { createPostgresTestDatabase } from "./postgres-test-database.js";

test("migration creates vector extension, tables, constraints, and policies", async () => {
  const database = await createPostgresTestDatabase();
  try {
    const extensions =
      await database.sql`select extname from pg_extension where extname = 'vector'`;
    assert.equal(extensions.length, 1);

    const policies =
      await database.sql`select tier, retrieval_top_k, private_upload_limit from tier_policies order by retrieval_top_k`;
    assert.deepEqual(policies, [
      { tier: "guest", retrieval_top_k: 3, private_upload_limit: 0 },
      { tier: "standard", retrieval_top_k: 5, private_upload_limit: 3 },
      { tier: "pro", retrieval_top_k: 8, private_upload_limit: null },
    ]);
  } finally {
    await database.dispose();
  }
});
