import type { Pool } from "pg";

import type {
  ConversationMessage,
  ConversationMessageRole,
  ConversationRepositoryLike,
} from "./conversation-types.js";

const DEFAULT_MAX_MESSAGES_PER_CONVERSATION = 20;

type PostgresConversationRepositoryOptions = {
  maxMessagesPerConversation?: number;
};

type ConversationMessageRow = {
  role: ConversationMessageRole;
  content: string;
};

export class PostgresConversationRepository
  implements ConversationRepositoryLike
{
  private readonly maxMessagesPerConversation: number;

  constructor(
    private readonly pool: Pool,
    options: PostgresConversationRepositoryOptions = {},
  ) {
    this.maxMessagesPerConversation =
      options.maxMessagesPerConversation ??
      DEFAULT_MAX_MESSAGES_PER_CONVERSATION;

    if (
      !Number.isInteger(this.maxMessagesPerConversation) ||
      this.maxMessagesPerConversation <= 0
    ) {
      throw new Error("maxMessagesPerConversation must be a positive integer");
    }
  }

  async appendMessages(
    conversationId: string,
    messages: ConversationMessage[],
  ): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");
      for (const message of messages) {
        await client.query(
          `INSERT INTO conversation_messages (conversation_id, role, content)
           VALUES ($1, $2, $3)`,
          [conversationId, message.role, message.content],
        );
      }
      await client.query(
        `DELETE FROM conversation_messages
         WHERE conversation_id = $1
           AND id NOT IN (
             SELECT id
             FROM conversation_messages
             WHERE conversation_id = $1
             ORDER BY id DESC
             LIMIT $2
           )`,
        [conversationId, this.maxMessagesPerConversation],
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async getMessages(conversationId: string): Promise<ConversationMessage[]> {
    const result = await this.pool.query<ConversationMessageRow>(
      `SELECT role, content
       FROM conversation_messages
       WHERE conversation_id = $1
       ORDER BY id ASC`,
      [conversationId],
    );

    return result.rows.map((message) => ({ ...message }));
  }
}
