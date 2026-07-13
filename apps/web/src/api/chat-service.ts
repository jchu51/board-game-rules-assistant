import { API_BASE_URL } from "./api-config";

type ApiErrorResponse = {
  error?: string;
};

export type ChatSummary = {
  id: string;
  title: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateChatResponse = {
  chat: ChatSummary;
};

export async function createChat(): Promise<CreateChatResponse> {
  const response = await fetch(`${API_BASE_URL}/chats`, {
    method: "POST",
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => ({}))) as
      ApiErrorResponse | undefined;

    throw new Error(errorBody?.error ?? "Failed to create chat");
  }

  return (await response.json()) as CreateChatResponse;
}
