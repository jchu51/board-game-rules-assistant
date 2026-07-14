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

  it("lists newest chat titles", async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [
        {
          id: "22222222-2222-4222-8222-222222222222",
          title: "Trading rules",
        },
        {
          id: "11111111-1111-4111-8111-111111111111",
          title: "New chat",
        },
      ],
    });
    const repository = new PostgresConversationRepository(createPool(query));

    await expect(repository.getChats()).resolves.toEqual([
      {
        conversationId: "22222222-2222-4222-8222-222222222222",
        title: "Trading rules",
      },
      {
        conversationId: "11111111-1111-4111-8111-111111111111",
        title: "New chat",
      },
    ]);
    expect(query).toHaveBeenCalledWith(
      `SELECT id, title
       FROM conversations
       ORDER BY created_at DESC, id DESC`,
    );
  });

  it("gets a populated chat with messages in database order", async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [
        {
          conversation_id: "conversation-a",
          title: "Rules",
          role: "user",
          content: "Question",
        },
        {
          conversation_id: "conversation-a",
          title: "Rules",
          role: "assistant",
          content: "Answer",
        },
      ],
    });
    const repository = new PostgresConversationRepository(createPool(query));

    await expect(repository.getChat("conversation-a")).resolves.toEqual({
      conversationId: "conversation-a",
      title: "Rules",
      messages: [
        { role: "user", content: "Question" },
        { role: "assistant", content: "Answer" },
      ],
    });
    expect(query).toHaveBeenCalledWith(
      expect.stringMatching(/ORDER BY m\.id ASC/),
      ["conversation-a"],
    );
  });

  it("gets an existing empty chat", async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [
        {
          conversation_id: "conversation-a",
          title: "New chat",
          role: null,
          content: null,
        },
      ],
    });
    const repository = new PostgresConversationRepository(createPool(query));

    await expect(repository.getChat("conversation-a")).resolves.toEqual({
      conversationId: "conversation-a",
      title: "New chat",
      messages: [],
    });
  });

  it("returns null when getting a missing chat", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const repository = new PostgresConversationRepository(createPool(query));

    await expect(repository.getChat("missing")).resolves.toBeNull();
  });

  it("updates a conversation title", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const repository = new PostgresConversationRepository(createPool(query));
    const conversationId = "11111111-1111-4111-8111-111111111111";

    await repository.updateTitle(conversationId, "Catan city production");

    expect(query).toHaveBeenCalledWith(
      expect.stringMatching(/UPDATE conversations[\s\S]*title = \$2/),
      [conversationId, "Catan city production"],
    );
  });

  it("deletes a conversation and relies on the foreign-key cascade", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rowCount: 1 })
      .mockResolvedValueOnce({ rows: [] });
    const release = vi.fn();
    const client = { query, release } as unknown as PoolClient;
    const pool = {
      connect: vi.fn().mockResolvedValue(client),
    } as unknown as Pool;
    const repository = new PostgresConversationRepository(pool);

    await expect(
      repository.deleteConversation("11111111-1111-4111-8111-111111111111"),
    ).resolves.toBe(true);
    expect(query.mock.calls).toEqual([
      ["BEGIN"],
      [
        expect.stringContaining("DELETE FROM conversations"),
        ["11111111-1111-4111-8111-111111111111"],
      ],
      ["COMMIT"],
    ]);
    expect(release).toHaveBeenCalledOnce();
  });

  it("returns false when the conversation does not exist", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rowCount: 0 })
      .mockResolvedValueOnce({ rows: [] });
    const release = vi.fn();
    const client = { query, release } as unknown as PoolClient;
    const pool = {
      connect: vi.fn().mockResolvedValue(client),
    } as unknown as Pool;
    const repository = new PostgresConversationRepository(pool);

    await expect(repository.deleteConversation("missing")).resolves.toBe(false);
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
