import postgres from "postgres";

import { runPostgresMigrations } from "../src/postgres/run-migrations.js";

export async function createPostgresTestDatabase() {
  const baseUrl = new URL(process.env.DATABASE_URL ?? "postgres://board_game_rules:board_game_rules@localhost:5432/board_game_rules");
  const databaseName = `board_game_rules_test_${crypto.randomUUID().replaceAll("-", "")}`;
  const admin = postgres(baseUrl.toString(), { max: 1 });
  let databaseCreated = false;
  let sql: ReturnType<typeof postgres> | undefined;
  try {
    await admin.unsafe(`CREATE DATABASE ${databaseName}`);
    databaseCreated = true;
    const databaseUrl = new URL(baseUrl);
    databaseUrl.pathname = `/${databaseName}`;
    const client = postgres(databaseUrl.toString(), { max: 1 });
    sql = client;
    await runPostgresMigrations(client);

    return {
      databaseUrl: databaseUrl.toString(),
      sql: client,
      async dispose() {
        let cleanupError: unknown;
        try { await client.end(); } catch (error) { cleanupError = error; }
        try {
          await admin.unsafe(`DROP DATABASE ${databaseName} WITH (FORCE)`);
          databaseCreated = false;
        } catch (error) { cleanupError ??= error; }
        try { await admin.end(); } catch (error) { cleanupError ??= error; }
        if (cleanupError) throw cleanupError;
      },
    };
  } catch (error) {
    try { await sql?.end(); } catch {
      // Preserve the setup or migration error that caused cleanup.
    }
    if (databaseCreated) {
      try { await admin.unsafe(`DROP DATABASE ${databaseName} WITH (FORCE)`); } catch {
        // Preserve the setup or migration error that caused cleanup.
      }
    }
    try {
      await admin.end();
    } catch {
      // Preserve the setup or migration error that caused cleanup.
    }
    throw error;
  }
}
