import { sql } from "drizzle-orm";

import {
  DatabaseUnavailableError,
  EmbeddingDimensionMismatchError,
  MissingVectorExtensionError,
} from "../domain/errors.js";
import type { PostgresDatabase } from "./client.js";

export const checkPostgresHealth = async (
  db: PostgresDatabase,
  expectedDimensions: number,
): Promise<void> => {
  if (expectedDimensions !== 3072) {
    throw new EmbeddingDimensionMismatchError(3072, expectedDimensions);
  }
  try {
    await db.execute(sql`select 1`);
    const extension = await db.execute<{ installed: boolean }>(
      sql`select exists(select 1 from pg_extension where extname = 'vector') as installed`,
    );
    if (!extension[0]?.installed) throw new MissingVectorExtensionError();
    const migrations = await db.execute<{ installed: boolean }>(sql`
      select exists(
        select 1 from information_schema.tables
        where table_schema = 'drizzle' and table_name = '__drizzle_migrations'
      ) as installed
    `);
    if (!migrations[0]?.installed) {
      throw new DatabaseUnavailableError("Drizzle migrations have not been applied");
    }
  } catch (error) {
    if (
      error instanceof MissingVectorExtensionError ||
      error instanceof DatabaseUnavailableError
    ) throw error;
    throw new DatabaseUnavailableError("database health check failed", {
      cause: error,
    });
  }
};
