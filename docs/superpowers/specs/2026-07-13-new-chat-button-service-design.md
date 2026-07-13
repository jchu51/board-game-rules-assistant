# New Chat Button Service Integration Design

## Goal

Use the server-backed `createChat()` web service when the user clicks the chat sidebar’s “New chat” button.

## Behavior

- Initial page setup remains local and does not call `POST /chats`.
- Deleting the final local conversation continues to use the existing local fallback and does not call `POST /chats`.
- Clicking “New chat” calls `createChat()` exactly once.
- While the request is pending, the button is disabled to prevent duplicate chats.
- On success, the returned chat is converted into an empty frontend `Conversation`, prepended to the conversation list, and made active.
- On failure, the current chat remains active and an accessible error message is shown near the New chat control.
- Starting a successful server chat invalidates pending retrieval results, clears streaming timers, resets the composer, and clears any earlier creation error.

## State

`useChatController` adds `isCreatingChat` and `createChatError`. `handleNewChat` becomes asynchronous and is the only controller path that calls the service.

The existing local `createNewConversation()` helper remains for initial state and delete fallback only.

## Testing

- Mock `createChat` in `chat-page.test.tsx`.
- Verify no call occurs on initial render.
- Verify a button click calls the service, activates the returned empty chat, and disables duplicate clicks while pending.
- Verify a failed request preserves the active chat and renders the error.
- Preserve all existing page behavior tests and run the complete web suite, build, lint, and formatter.
