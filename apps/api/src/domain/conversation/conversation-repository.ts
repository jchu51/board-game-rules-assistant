import type { Conversation, ConversationMessage } from "./conversation";

export interface ConversationRepository {
  createConversation(): Promise<Conversation["id"]>;
  appendMessages(
    conversationId: string,
    messages: ConversationMessage[],
  ): Promise<void>;
  getMessages(conversationId: string): Promise<ConversationMessage[]>;
}
