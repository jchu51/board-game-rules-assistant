import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema.js";

export const createPostgresClient = (databaseUrl: string) => {
  const sql = postgres(databaseUrl, { idle_timeout: 1 });
  return { sql, db: drizzle(sql, { schema }) };
};

export type PostgresDatabase = ReturnType<typeof createPostgresClient>["db"];
