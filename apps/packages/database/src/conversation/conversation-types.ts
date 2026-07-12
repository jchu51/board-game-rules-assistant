export type ConversationMessageRole = "user" | "assistant";

export type ConversationMessage = {
  role: ConversationMessageRole;
  content: string;
};

export type ConversationRepositoryLike = {
  appendMessages(
    conversationId: string,
    messages: ConversationMessage[],
  ): Promise<void>;
  getMessages(conversationId: string): Promise<ConversationMessage[]>;
};
