import type { Actor, ConversationRepository } from "@board-game-rules-assistant/database";
import { PersistenceNotFoundError } from "@board-game-rules-assistant/database";

export class ConversationService {
  constructor(private readonly conversations: ConversationRepository) {}

  async create(input: { actor: Actor; gameId: string; title: string }) {
    return this.conversations.createConversation(input);
  }

  list(actor: Actor) { return this.conversations.listOwnedConversations({ actor }); }

  async get(actor: Actor, conversationId: string) {
    const conversation = await this.conversations.getOwnedConversation({ actor, conversationId });
    if (!conversation) throw new PersistenceNotFoundError("conversation");
    const messages = await this.conversations.listMessages({ actor, conversationId });
    return { ...conversation, messages };
  }

  async delete(actor: Actor, conversationId: string): Promise<void> {
    if (!await this.conversations.deleteOwnedConversation({ actor, conversationId })) {
      throw new PersistenceNotFoundError("conversation");
    }
  }
}
