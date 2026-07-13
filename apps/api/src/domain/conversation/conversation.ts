export type Conversation = {
  id: string;
  title: string;
  game: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ConversationMetadata = Pick<Conversation, "title" | "game">;

export type ConversationSummary = {
  conversationId: Conversation["id"];
  title: Conversation["title"];
  game: Conversation["game"];
};

export type ConversationMessageRole = "user" | "assistant";

export type ConversationMessage = {
  role: ConversationMessageRole;
  content: string;
};

export type ConversationDetail = ConversationSummary & {
  messages: ConversationMessage[];
};
