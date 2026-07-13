import type {
  Conversation,
  ConversationDetail,
  ConversationMessage,
  ConversationSummary,
} from "./conversation";

export interface ConversationRepository {
  createConversation(): Promise<Conversation["id"]>;
  deleteConversation(conversationId: Conversation["id"]): Promise<boolean>;
  getChat(
    conversationId: Conversation["id"],
  ): Promise<ConversationDetail | null>;
  getChats(): Promise<ConversationSummary[]>;
  appendMessages(
    conversationId: string,
    messages: ConversationMessage[],
  ): Promise<void>;
  getMessages(conversationId: string): Promise<ConversationMessage[]>;
}
