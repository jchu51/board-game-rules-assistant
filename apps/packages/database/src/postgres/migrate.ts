import postgres from "postgres";

import { runPostgresMigrations } from "./run-migrations.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");

const sql = postgres(databaseUrl, { max: 1 });
try {
  await runPostgresMigrations(sql);
} finally {
  await sql.end();
}
