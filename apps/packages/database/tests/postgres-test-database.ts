import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import postgres from "postgres";

const migrationUrl = new URL("../drizzle/0000_initial_persistence.sql", import.meta.url);

export async function createPostgresTestDatabase() {
  const baseUrl = new URL(process.env.DATABASE_URL ?? "postgres://board_game_rules:board_game_rules@localhost:5432/board_game_rules");
  const databaseName = `board_game_rules_test_${crypto.randomUUID().replaceAll("-", "")}`;
  const admin = postgres(baseUrl.toString(), { max: 1 });
  await admin.unsafe(`CREATE DATABASE ${databaseName}`);
  const databaseUrl = new URL(baseUrl);
  databaseUrl.pathname = `/${databaseName}`;
  const sql = postgres(databaseUrl.toString(), { max: 1 });

  const migration = await readFile(fileURLToPath(migrationUrl), "utf8");
  await sql.unsafe(migration);

  return {
    databaseUrl: databaseUrl.toString(),
    sql,
    async dispose() {
      await sql.end();
      await admin.unsafe(`DROP DATABASE ${databaseName} WITH (FORCE)`);
      await admin.end();
    },
  };
}
