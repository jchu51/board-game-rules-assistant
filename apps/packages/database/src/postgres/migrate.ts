import { readFile } from "node:fs/promises";

import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");

const sql = postgres(databaseUrl, { max: 1 });
try {
  const migration = await readFile(new URL("../../drizzle/0000_initial_persistence.sql", import.meta.url), "utf8");
  await sql.unsafe(migration);
} finally {
  await sql.end();
}
