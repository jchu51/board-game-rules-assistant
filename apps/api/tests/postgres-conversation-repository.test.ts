import type { Pool, PoolClient } from "pg";
import { describe, expect, it, vi } from "vitest";

import { PostgresConversationRepository } from "../src/infrastructure/persistence/conversation/postgres-conversation-repository";

const createPool = (query = vi.fn()) => ({ query }) as unknown as Pool;

describe("PostgresConversationRepository", () => {
  it("creates a conversation with a UUID and default title", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const repository = new PostgresConversationRepository(createPool(query));

    const conversationId = await repository.createConversation();

    expect(conversationId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(query).toHaveBeenCalledWith(
      "INSERT INTO conversations (id, title) VALUES ($1, $2)",
      [conversationId, "New chat"],
    );
  });

  it("stores messages and trims older rows in one transaction", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const release = vi.fn();
    const client = { query, release } as unknown as PoolClient;
    const pool = {
      connect: vi.fn().mockResolvedValue(client),
    } as unknown as Pool;
    const repository = new PostgresConversationRepository(pool, {
      maxMessagesPerConversation: 3,
    });

    await repository.appendMessages("conversation-a", [
      { role: "user", content: "first" },
      { role: "assistant", content: "second" },
    ]);

    expect(query.mock.calls).toEqual([
      ["BEGIN"],
      [
        expect.stringContaining("INSERT INTO conversation_messages"),
        ["conversation-a", "user", "first"],
      ],
      [
        expect.stringContaining("INSERT INTO conversation_messages"),
        ["conversation-a", "assistant", "second"],
      ],
      [
        expect.stringContaining("DELETE FROM conversation_messages"),
        ["conversation-a", 3],
      ],
      ["COMMIT"],
    ]);
    expect(release).toHaveBeenCalledOnce();
  });

  it("returns message rows without exposing the database result objects", async () => {
    const rows = [{ role: "user" as const, content: "hello" }];
    const query = vi.fn().mockResolvedValue({ rows });
    const repository = new PostgresConversationRepository(createPool(query));

    const messages = await repository.getMessages("conversation-a");

    expect(messages).toEqual(rows);
    expect(messages[0]).not.toBe(rows[0]);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("FROM conversation_messages"),
      ["conversation-a"],
    );
  });
});
