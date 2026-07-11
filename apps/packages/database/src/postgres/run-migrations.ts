import { fileURLToPath } from "node:url";

import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import type { Sql } from "postgres";

const migrationsFolder = fileURLToPath(new URL("../../drizzle", import.meta.url));

export async function runPostgresMigrations(sql: Sql): Promise<void> {
  await migrate(drizzle(sql), { migrationsFolder });
}
