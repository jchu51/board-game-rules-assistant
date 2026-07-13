export type Citation = {
  n: number;
  book: string;
  page?: number;
  quote: string;
};

export type UserMessage = {
  id: string;
  role: "user";
  text: string;
};

export type AssistantPhase = "thinking" | "streaming" | "done";

export type AssistantMessage = {
  id: string;
  role: "assistant";
  text: string;
  cites: Citation[];
  phase: AssistantPhase;
  revealed: number;
};

export type Message = UserMessage | AssistantMessage;

export type Conversation = {
  id: string;
  title: string;
  game: string | null;
  messages: Message[];
};

export type Role = "guest" | "standard" | "pro" | "admin";

export type RetrievalAnswer = {
  game: string | null;
  text: string;
  cites: Citation[];
};
