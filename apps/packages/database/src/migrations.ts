import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import type { Pool } from "pg";

const migrationVersions = [
  "0001_conversation_messages",
  "0002_conversations",
  "0003_conversation_game",
] as const;

const migrationUrl = (version: string): URL => {
  const sourceUrl = new URL(`../migrations/${version}.sql`, import.meta.url);
  const compiledUrl = new URL(`./migrations/${version}.sql`, import.meta.url);

  return fileURLToPath(import.meta.url).includes("/dist/")
    ? compiledUrl
    : sourceUrl;
};

export const runMigrations = async (pool: Pool): Promise<void> => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_migrations (
      version TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  for (const version of migrationVersions) {
    const applied = await pool.query(
      "SELECT 1 FROM app_migrations WHERE version = $1",
      [version],
    );
    if (applied.rowCount !== 0) {
      continue;
    }

    const sql = await readFile(migrationUrl(version), "utf8");
    const client = await pool.connect();
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
    } finally {
      client.release();
    }
  }
};
