import type {
  Conversation,
  ConversationMessage,
  ConversationSummary,
} from "./conversation";

export interface ConversationRepository {
  createConversation(): Promise<Conversation["id"]>;
  deleteConversation(conversationId: Conversation["id"]): Promise<boolean>;
  getChats(): Promise<ConversationSummary[]>;
  appendMessages(
    conversationId: string,
    messages: ConversationMessage[],
  ): Promise<void>;
  getMessages(conversationId: string): Promise<ConversationMessage[]>;
}
