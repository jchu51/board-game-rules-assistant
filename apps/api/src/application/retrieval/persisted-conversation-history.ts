import type { Actor, ConversationRepository } from "@board-game-rules-assistant/database";
import type { ConversationMessage } from "../../domain/conversation/conversation-repository";

export class PersistedConversationHistory {
  constructor(private readonly repository: ConversationRepository) {}

  async ensureConversation(actor: Actor, conversationId: string, gameId: string): Promise<void> {
    const existing = await this.repository.getOwnedConversation({ actor, conversationId });
    if (existing) {
      if (existing.gameId !== gameId) throw new Error("conversation game does not match gameId");
      return;
    }
    await this.repository.createConversation({ id: conversationId, actor, gameId, title: "Rules question" });
  }

  async getMessages(actor: Actor, conversationId: string): Promise<ConversationMessage[]> {
    return (await this.repository.listMessages({ actor, conversationId }))
      .filter((message) => message.role === "user" || message.role === "assistant")
      .map(({ role, content }) => ({ role: role as "user" | "assistant", content }));
  }

  async appendMessages(actor: Actor, conversationId: string, messages: ConversationMessage[]): Promise<void> {
    for (const message of messages) {
      if (message.role === "user") {
        await this.repository.appendUserMessage({ actor, conversationId, content: message.content });
      } else {
        await this.repository.appendAssistantMessageWithCitations({ actor, conversationId, content: message.content, model: "rules-assistant", citations: [] });
      }
    }
  }
}
