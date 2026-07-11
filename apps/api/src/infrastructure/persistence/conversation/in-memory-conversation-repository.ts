import type {
  ConversationMessage,
  ConversationRepository,
} from "../../../domain/conversation/conversation-repository";

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

  appendMessages(
    conversationId: string,
    messages: ConversationMessage[],
  ): void {
    const currentMessages = this.conversations.get(conversationId) ?? [];
    const retainedMessages = [
      ...currentMessages,
      ...messages.map((message) => ({ ...message })),
    ].slice(-this.maxMessagesPerConversation);

    this.conversations.set(conversationId, retainedMessages);
  }

  getMessages(conversationId: string): ConversationMessage[] {
    return (this.conversations.get(conversationId) ?? []).map((message) => ({
      ...message,
    }));
  }
}
