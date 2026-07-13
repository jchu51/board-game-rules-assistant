# New Chat Button Service Integration Design

## Goal

Use the server-backed `createChat()` web service when the user clicks the chat sidebar’s “New chat” button.

## Behavior

- Initial page setup has no conversations and does not call `POST /chats`.
- Seeded Catan and Gloomhaven conversations are removed from controller state.
- The sidebar initially contains no conversation groups or entries; the “New chat” button remains available.
- Clicking “New chat” calls `createChat()` exactly once.
- While the request is pending, the button is disabled to prevent duplicate chats.
- On success, the returned chat is converted into an empty frontend `Conversation`, added to the sidebar’s New group, and made active so the empty composer appears.
- On failure, the current chat remains active and an accessible error message is shown near the New chat control.
- Starting a successful server chat invalidates pending retrieval results, clears streaming timers, resets the composer, and clears any earlier creation error.

## State

`useChatController` starts with an empty conversation list and adds `isCreatingChat` and `createChatError`. `handleNewChat` becomes asynchronous and is the only controller path that calls the service.

`activeConversation` is optional until a server chat is created. The view renders a clean empty workspace in that state without a composer. Deleting the final chat returns to the same clean state and does not create a replacement.

## Testing

- Mock `createChat` in `chat-page.test.tsx`.
- Verify no call occurs on initial render.
- Verify seeded/default conversations and the composer are absent before creation.
- Verify a button click calls the service, activates the returned empty chat, and disables duplicate clicks while pending.
- Verify a failed request preserves the active chat and renders the error.
- Preserve all existing page behavior tests and run the complete web suite, build, lint, and formatter.
