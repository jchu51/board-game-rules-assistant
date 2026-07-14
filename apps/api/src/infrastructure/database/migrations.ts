import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import type { Pool, PoolClient } from "pg";

const migrationVersions = ["0001_initial_schema"] as const;

// Serializes concurrent migration runs against the same database:
// statements like CREATE EXTENSION IF NOT EXISTS are not concurrency-safe.
const MIGRATION_LOCK_KEY = 723561;

const migrationUrl = (version: string): URL => {
  const sourceUrl = new URL(
    `../../../migrations/${version}.sql`,
    import.meta.url,
  );
  const compiledUrl = new URL(`./migrations/${version}.sql`, import.meta.url);

  return fileURLToPath(import.meta.url).includes("/dist/")
    ? compiledUrl
    : sourceUrl;
};

const applyPendingMigrations = async (client: PoolClient): Promise<void> => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS app_migrations (
      version TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  for (const version of migrationVersions) {
    const applied = await client.query(
      "SELECT 1 FROM app_migrations WHERE version = $1",
      [version],
    );
    if (applied.rowCount !== 0) {
      continue;
    }

    const sql = await readFile(migrationUrl(version), "utf8");
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query(
        "INSERT INTO app_migrations (version) VALUES ($1) ON CONFLICT DO NOTHING",
        [version],
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }
};

export const runMigrations = async (pool: Pool): Promise<void> => {
  const client = await pool.connect();
  try {
    await client.query("SELECT pg_advisory_lock($1)", [MIGRATION_LOCK_KEY]);
    try {
      await applyPendingMigrations(client);
    } finally {
      await client.query("SELECT pg_advisory_unlock($1)", [
        MIGRATION_LOCK_KEY,
      ]);
    }
  } finally {
    client.release();
  }
};
