import { randomUUID } from "node:crypto";

import type { ConversationRepository } from "../../../domain/conversation/conversation-repository";
import type { ConversationMessage } from "../../../domain/conversation/conversation";

const DEFAULT_MAX_MESSAGES_PER_CONVERSATION = 20;

type InMemoryConversationRepositoryOptions = {
  maxMessagesPerConversation?: number;
};

export class InMemoryConversationRepository implements ConversationRepository {
  private readonly conversations = new Map<string, ConversationMessage[]>();
  private readonly maxMessagesPerConversation: number;

  constructor(options: InMemoryConversationRepositoryOptions = {}) {
    this.maxMessagesPerConversation =
      options.maxMessagesPerConversation ??
      DEFAULT_MAX_MESSAGES_PER_CONVERSATION;
  }

  async createConversation(): Promise<string> {
    const conversationId = randomUUID();
    this.conversations.set(conversationId, []);
    return conversationId;
  }

  async appendMessages(
    conversationId: string,
    messages: ConversationMessage[],
  ): Promise<void> {
    const currentMessages = this.conversations.get(conversationId) ?? [];
    const retainedMessages = [
      ...currentMessages,
      ...messages.map((message) => ({ ...message })),
    ].slice(-this.maxMessagesPerConversation);

    this.conversations.set(conversationId, retainedMessages);
  }

  async getMessages(conversationId: string): Promise<ConversationMessage[]> {
    return (this.conversations.get(conversationId) ?? []).map((message) => ({
      ...message,
    }));
  }
}
