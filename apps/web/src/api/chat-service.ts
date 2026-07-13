import { API_BASE_URL } from "./api-config";

type ApiErrorResponse = {
  error?: string;
};

export type CreateChatResponse = {
  conversationId: string;
};

export type ChatSummary = {
  conversationId: string;
  title: string;
};

export type ListChatsResponse = {
  chats: ChatSummary[];
};

export async function listChats(): Promise<ListChatsResponse> {
  const response = await fetch(`${API_BASE_URL}/chats`);

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => ({}))) as
      ApiErrorResponse | undefined;

    throw new Error(errorBody?.error ?? "Failed to load chats");
  }

  return (await response.json()) as ListChatsResponse;
}

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

export async function deleteChat(conversationId: string): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/chats/${encodeURIComponent(conversationId)}`,
    { method: "DELETE" },
  );

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => ({}))) as
      ApiErrorResponse | undefined;

    throw new Error(errorBody?.error ?? "Failed to delete chat");
  }
}
