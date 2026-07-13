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
        { version: "0003_rulebooks" },
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
            `SELECT column_name, data_type, is_nullable
             FROM information_schema.columns
             WHERE table_schema = current_schema()
               AND table_name = 'rulebooks'
             ORDER BY column_name`,
          )
        ).rows,
      ).toEqual([
        {
          column_name: "created_at",
          data_type: "timestamp with time zone",
          is_nullable: "NO",
        },
        {
          column_name: "file_size",
          data_type: "integer",
          is_nullable: "NO",
        },
        { column_name: "game_name", data_type: "text", is_nullable: "NO" },
        { column_name: "id", data_type: "uuid", is_nullable: "NO" },
        { column_name: "mime_type", data_type: "text", is_nullable: "NO" },
        { column_name: "pdf_data", data_type: "bytea", is_nullable: "NO" },
        { column_name: "pdf_name", data_type: "text", is_nullable: "NO" },
      ]);
    } finally {
      await database.dispose();
    }
  });
});
