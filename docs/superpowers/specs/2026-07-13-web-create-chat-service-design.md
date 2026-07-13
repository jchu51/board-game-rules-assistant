# Web Create Chat Service Design

## Goal

Add a typed web API client for creating an empty chat through the bodyless `POST /chats` endpoint.

## API Client

Create `apps/web/src/api/chat-service.ts` with:

- `ChatSummary`, containing `id`, `title`, `messageCount`, `createdAt`, and `updatedAt`.
- `CreateChatResponse`, containing `chat: ChatSummary`.
- `createChat(): Promise<CreateChatResponse>`.

`createChat` calls `${API_BASE_URL}/chats` with only `{ method: "POST" }`. It sends no request body and no `Content-Type` header.

## Errors

For a non-success response, the client reads the existing `{ error?: string }` envelope. It throws the API message when available and otherwise throws `Failed to create chat`.

## Testing

Extend the web API client tests to verify:

- The exact bodyless POST request.
- The parsed typed response.
- Propagation of a readable API error.
- The fallback error when the response body cannot be read.

## Scope

This change only creates the API service. It does not yet connect chat creation to the React chat controller or UI.
