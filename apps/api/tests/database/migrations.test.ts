import { describe, expect, it } from "vitest";

import { runMigrations } from "../../src/infrastructure/database/migrations";
import { createTestDatabase } from "./test-database";

describe("runMigrations", () => {
  it("enables pgvector and records idempotent schema migrations", async () => {
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
        { version: "0004_conversation_message_foreign_key" },
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
            `SELECT data_type
             FROM information_schema.columns
             WHERE table_schema = current_schema()
               AND table_name = 'conversation_messages'
               AND column_name = 'conversation_id'`,
          )
        ).rows,
      ).toEqual([{ data_type: "uuid" }]);
      await expect(
        database.pool.query(
          `INSERT INTO conversation_messages (conversation_id, role, content)
           VALUES ($1, 'user', 'orphan')`,
          ["11111111-1111-4111-8111-111111111111"],
        ),
      ).rejects.toMatchObject({ code: "23503" });

      const conversationId = "22222222-2222-4222-8222-222222222222";
      await database.pool.query(
        "INSERT INTO conversations (id, title) VALUES ($1, 'New chat')",
        [conversationId],
      );
      await database.pool.query(
        `INSERT INTO conversation_messages (conversation_id, role, content)
         VALUES ($1, 'user', 'question')`,
        [conversationId],
      );
      await database.pool.query("DELETE FROM conversations WHERE id = $1", [
        conversationId,
      ]);
      expect(
        (
          await database.pool.query(
            "SELECT 1 FROM conversation_messages WHERE conversation_id = $1",
            [conversationId],
          )
        ).rowCount,
      ).toBe(0);
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
