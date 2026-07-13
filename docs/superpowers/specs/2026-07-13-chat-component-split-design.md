# Chat Component Split Design

## Goal

Refactor `apps/web/src/components/chat/chat-view.tsx` so each React file declares one component and no single file owns the entire chat feature. Preserve the current UI, routes, retrieval behavior, and work-in-progress changes.

## Structure

`chat-view.tsx` remains the feature entry point and declares only `ChatView`. It composes focused components from the same `components/chat` directory:

- `chat-sidebar.tsx`
- `conversation-group.tsx`
- `chat-header.tsx`
- `guest-banner.tsx`
- `empty-chat.tsx`
- `conversation-panel.tsx`
- `conversation-message.tsx`
- `thinking-dots.tsx`
- `citation-marker.tsx`
- `composer.tsx`
- `sources-rail.tsx`
- `plan-popover.tsx`

Each `.tsx` file declares and exports exactly one React component. React-free domain code moves to `chat-types.ts`, `chat-config.ts`, and `chat-helpers.ts`. Conversation state, retrieval requests, answer streaming, timer cleanup, and stale-response protection move to `use-chat-controller.ts`.

## Data Flow

`ChatView` calls `useChatController` once. It passes narrow values and callbacks to its direct children. Presentation components do not call the retrieval API or own cross-screen state. The controller preserves the current request identifiers, message identifiers, timer lifecycle, conversation updates, guest question count, and search behavior.

## Behavior and Error Handling

This is a behavior-preserving refactor. Existing copy, styles, responsive layout, role preview, guest banner, chat search, deletion, citations, and Library navigation remain unchanged. Retrieval errors and empty results continue to use the current messages. Starting a new chat still invalidates pending results and clears streaming timers.

## Testing

- Preserve all current `ChatPage` integration tests.
- Add unit tests for game detection, retrieval-answer mapping, citation selection, and fallback behavior in `chat-helpers.test.ts`.
- Add React Testing Library coverage for `Composer` submission/keyboard behavior and `ConversationGroup` selection/deletion behavior.
- Retain stable `id` and `data-testid` attributes on interactive elements; add matching pairs to extracted interactive elements that currently lack them.
- Run the complete web test suite, TypeScript/Vite build, oxlint, formatter, and `git diff --check`.

## Scope

This refactor does not redesign the interface, change `/chat` routing, alter API contracts, add persistence, or introduce a state-management dependency.
