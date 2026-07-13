# Chat Component Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the chat feature into focused modules so every `.tsx` file declares exactly one React component while preserving behavior.

**Architecture:** Pure chat types, configuration, and transformations live in `.ts` modules. `useChatController` owns cross-screen state and async lifecycle. `ChatView` calls the controller and composes feature-specific presentation components with narrow props.

**Tech Stack:** React 19, TypeScript 6, React Router 8, Vitest, React Testing Library, Vite, Tailwind CSS

## Global Constraints

- Preserve current UI, copy, responsive behavior, API contracts, and `/chat` routing.
- Preserve the current uncommitted chat redesign.
- Each chat `.tsx` file declares exactly one React component.
- Interactive elements retain matching `id` and `data-testid` attributes.
- No new state-management or UI dependency.

---

### Task 1: Extract Pure Chat Domain Code

**Files:**
- Create: `apps/web/src/components/chat/chat-types.ts`
- Create: `apps/web/src/components/chat/chat-config.ts`
- Create: `apps/web/src/components/chat/chat-helpers.ts`
- Create: `apps/web/src/components/chat/chat-helpers.test.ts`
- Modify: `apps/web/src/components/chat/chat-view.tsx`

**Interfaces:**
- `detectGame(text: string): string | null`
- `buildRetrievalAnswer(question: string, response: RetrievalSearchResponse): RetrievalAnswer`
- `getLastCitedMessage(messages: Message[]): AssistantMessage | undefined`
- `createNewConversation(): Conversation`
- `clearTimers(timers: Record<string, number>): void`

- [ ] Write helper tests for game detection, citation mapping, empty-result fallback, and last cited message.
- [ ] Run `npm test -w web -- src/components/chat/chat-helpers.test.ts` and confirm failure because the helper module is absent.
- [ ] Move types, configuration, seed conversations, and pure helpers unchanged into their new modules.
- [ ] Run helper and page tests and confirm they pass.

### Task 2: Extract Chat Controller

**Files:**
- Create: `apps/web/src/components/chat/use-chat-controller.ts`
- Modify: `apps/web/src/components/chat/chat-view.tsx`
- Test: `apps/web/src/pages/chat-page.test.tsx`

**Interfaces:**
- `useChatController(): ChatController`
- `ChatController` exposes active conversation, filtered/grouped conversations, role/input/search state, request state, scroll ref, derived banner/source data, and existing callbacks.

- [ ] Add a page assertion proving a pending retrieval result is still ignored after starting a new chat.
- [ ] Run the targeted page test and confirm the assertion protects the existing stale-response behavior.
- [ ] Move state, refs, effects, update helpers, `sendText`, new-chat, deletion, filtering, grouping, and banner derivation into the hook without rewriting them.
- [ ] Make `ChatView` consume the controller.
- [ ] Run all `ChatPage` tests and confirm they pass.

### Task 3: Extract One Component Per React File

**Files:**
- Create: `apps/web/src/components/chat/chat-sidebar.tsx`
- Create: `apps/web/src/components/chat/conversation-group.tsx`
- Create: `apps/web/src/components/chat/chat-header.tsx`
- Create: `apps/web/src/components/chat/guest-banner.tsx`
- Create: `apps/web/src/components/chat/empty-chat.tsx`
- Create: `apps/web/src/components/chat/conversation-panel.tsx`
- Create: `apps/web/src/components/chat/conversation-message.tsx`
- Create: `apps/web/src/components/chat/thinking-dots.tsx`
- Create: `apps/web/src/components/chat/citation-marker.tsx`
- Create: `apps/web/src/components/chat/composer.tsx`
- Create: `apps/web/src/components/chat/sources-rail.tsx`
- Create: `apps/web/src/components/chat/plan-popover.tsx`
- Create: `apps/web/src/components/chat/composer.test.tsx`
- Create: `apps/web/src/components/chat/conversation-group.test.tsx`
- Modify: `apps/web/src/components/chat/chat-view.tsx`

**Interfaces:**
- Each component exports one named component and a props type where reused.
- `ChatView` remains the only feature-level composer and contains no state or helper component declarations.

- [ ] Write failing RTL tests for Composer submit/Enter/Shift+Enter behavior.
- [ ] Write failing RTL tests for ConversationGroup selection and deletion behavior.
- [ ] Move each existing component and its markup unchanged into its own file.
- [ ] Split the remaining layout into sidebar, header, banner, empty state, and conversation panel components.
- [ ] Reduce `chat-view.tsx` to a small controller-to-component composition.
- [ ] Run focused component and page tests.
- [ ] Run `npm test -w web`, `npm run build -w web`, and `npm run lint -w web`.
- [ ] Run the registered formatter, restore any unrelated formatter changes, then run `git diff --check`.
- [ ] Confirm every `.tsx` file under `components/chat` has exactly one component declaration and inspect final scope with `git status --short`.
