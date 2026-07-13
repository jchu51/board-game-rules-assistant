export type Conversation = {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ConversationMessageRole = "user" | "assistant";

export type ConversationMessage = {
  role: ConversationMessageRole;
  content: string;
};
