# Chat Page Refactor Design

## Goal

Rename the Ask page to Chat and make the route-level file contain only the `ChatPage` component. Move supporting chat UI and state into focused modules without changing the current user experience.

## Structure

- `apps/web/src/pages/chat-page.tsx` exports only `ChatPage` and composes the chat UI.
- `apps/web/src/components/chat/` contains chat-specific presentation components, including the composer, conversation navigation, messages, sources rail, and plan popover.
- `apps/web/src/hooks/use-chat.ts` owns conversation state, retrieval requests, answer streaming, timers, stale-response protection, new-chat behavior, and conversation deletion.
- Shared chat-only types, constants, and pure helpers live beside the chat components in focused files rather than in the route component.

The extracted modules remain feature-specific. They will not be promoted into the general `components/ui` library.

## Routing and Naming

- The primary route changes from `/ask` to `/chat`.
- `/ask` redirects to `/chat` so existing links remain valid.
- The root and catch-all redirects target `/chat`.
- Navigation labels, component names, test names, and stable element identifiers use `chat` terminology where they refer to this feature.
- User-facing copy such as “Ask the Referee” and “Ask a rules question” remains unchanged where it describes the action rather than the page name.

## Behavior

The refactor preserves the current work-in-progress behavior, including conversation history, role previews, guest limits, rulebook retrieval, citation rendering, simulated streaming, stale-request protection, and links to the Library.

`ChatPage` reads the state and actions exposed by `useChat` and passes narrow props to presentation components. Presentation components do not call the retrieval API directly.

## Error Handling

Existing retrieval failure behavior remains intact. Starting a new chat invalidates pending searches, and stale results cannot update another conversation. Timer cleanup continues when the page unmounts or a request is superseded.

## Testing and Verification

- Rename the page test to `chat-page.test.tsx` and preserve its behavioral coverage.
- Update application routing tests for `/chat`, the `/ask` compatibility redirect, and navigation.
- Add focused unit tests only for extracted pure logic that is no longer adequately covered through the page tests.
- Run the affected web tests, TypeScript checks, formatter, and build after the refactor.

## Scope

This change does not redesign the chat interface, change API contracts, add persistence, or alter subscription behavior. It only improves naming and module boundaries while preserving the current uncommitted UI work.
