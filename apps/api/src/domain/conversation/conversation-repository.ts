export type ConversationMessageRole = "user" | "assistant";

export type ConversationMessage = {
  role: ConversationMessageRole;
  content: string;
};

export interface ConversationRepository {
  appendMessages(
    conversationId: string,
    messages: ConversationMessage[],
  ): Promise<void>;
  getMessages(conversationId: string): Promise<ConversationMessage[]>;
}
