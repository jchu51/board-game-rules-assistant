import { sql } from "drizzle-orm";

import {
  DatabaseUnavailableError,
  EmbeddingDimensionMismatchError,
  MissingVectorExtensionError,
} from "../domain/errors.js";
import type { PostgresDatabase } from "./client.js";

// Update both values whenever a production migration is added.
export const CURRENT_MIGRATION_STATE = {
  count: 4,
  latestCreatedAt: "1783830000000",
} as const;

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
    const migrations = await db.execute<{
      appliedCount: number;
      latestCreatedAt: string | null;
    }>(sql`
      select
        count(*)::integer as "appliedCount",
        max(created_at)::text as "latestCreatedAt"
      from drizzle.__drizzle_migrations
    `);
    const migrationState = migrations[0];
    if (
      migrationState?.appliedCount !== CURRENT_MIGRATION_STATE.count ||
      migrationState.latestCreatedAt !== CURRENT_MIGRATION_STATE.latestCreatedAt
    ) {
      throw new DatabaseUnavailableError(
        "database migration state is not current",
      );
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
