import { randomUUID } from "node:crypto";

import type { ConversationRepository } from "../../../domain/conversation/conversation-repository";
import type {
  ConversationDetail,
  ConversationMessage,
  ConversationSummary,
} from "../../../domain/conversation/conversation";

const DEFAULT_MAX_MESSAGES_PER_CONVERSATION = 20;

type InMemoryConversationRepositoryOptions = {
  maxMessagesPerConversation?: number;
};

export class InMemoryConversationRepository implements ConversationRepository {
  private readonly chats: ConversationSummary[] = [];
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
    this.chats.unshift({
      conversationId,
      title: "New chat",
    });
    return conversationId;
  }

  async deleteConversation(conversationId: string): Promise<boolean> {
    const chatIndex = this.chats.findIndex(
      (chat) => chat.conversationId === conversationId,
    );
    if (chatIndex === -1) return false;

    this.chats.splice(chatIndex, 1);
    this.conversations.delete(conversationId);
    return true;
  }

  async getChats(): Promise<ConversationSummary[]> {
    return this.chats.map((chat) => ({ ...chat }));
  }

  async getChat(conversationId: string): Promise<ConversationDetail | null> {
    const chat = this.chats.find(
      (candidate) => candidate.conversationId === conversationId,
    );
    if (!chat) return null;

    return {
      ...chat,
      messages: (this.conversations.get(conversationId) ?? []).map(
        (message) => ({ ...message }),
      ),
    };
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
