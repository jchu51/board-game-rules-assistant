export type Conversation = {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ConversationSummary = {
  conversationId: Conversation["id"];
  title: Conversation["title"];
};

export type ConversationMessageRole = "user" | "assistant";

export type ConversationMessage = {
  role: ConversationMessageRole;
  content: string;
};

export type ConversationDetail = ConversationSummary & {
  messages: ConversationMessage[];
};
