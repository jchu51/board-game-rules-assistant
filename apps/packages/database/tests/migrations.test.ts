import { describe, expect, it } from "vitest";

import { runMigrations } from "../src/migrations.js";
import { createTestDatabase } from "./test-database.js";

describe("runMigrations", () => {
  it("enables pgvector and records an idempotent schema migration", async () => {
    const database = await createTestDatabase();
    try {
      await runMigrations(database.pool);
      await runMigrations(database.pool);

      expect(
        (
          await database.pool.query(
            "SELECT extname FROM pg_extension WHERE extname = 'vector'",
          )
        ).rows,
      ).toEqual([{ extname: "vector" }]);
      expect(
        (
          await database.pool.query(
            "SELECT version FROM app_migrations ORDER BY version",
          )
        ).rows,
      ).toEqual([
        { version: "0001_conversation_messages" },
        { version: "0002_conversations" },
        { version: "0003_conversation_game" },
      ]);
      expect(
        (
          await database.pool.query(
            "SELECT to_regclass('public.conversations') AS table_name",
          )
      ).rows,
      ).toEqual([{ table_name: "public.conversations" }]);
      expect(
        (
          await database.pool.query(
            `SELECT is_nullable, column_default
             FROM information_schema.columns
             WHERE table_schema = 'public'
               AND table_name = 'conversations'
               AND column_name = 'game'`,
          )
        ).rows,
      ).toEqual([{ is_nullable: "YES", column_default: null }]);
    } finally {
      await database.dispose();
    }
  });
});
