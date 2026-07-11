export type ConversationMessageRole = "user" | "assistant";

export type ConversationMessage = {
  role: ConversationMessageRole;
  content: string;
};

export interface ConversationRepository {
  appendMessages(conversationId: string, messages: ConversationMessage[]): void;
  getMessages(conversationId: string): ConversationMessage[];
}
