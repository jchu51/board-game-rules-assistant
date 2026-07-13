# New Chat Button Service Integration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Start the chat UI empty and create the first real chat only when the user clicks the New chat button.

**Architecture:** `useChatController` owns the asynchronous create lifecycle and maps the API summary to an empty UI conversation. `ChatView` supports an optional active conversation, while `ChatSidebar` exposes pending and error state through the controller.

**Tech Stack:** React 19, TypeScript, Fetch API, Vitest, React Testing Library

## Global Constraints

- Do not call `createChat()` on mount or delete.
- Remove seeded/default conversations from initial state.
- Prevent duplicate create requests while one is pending.
- Preserve the current chat when creation fails.

---

### Task 1: Specify Clean Start and Server Creation

**Files:**
- Modify: `apps/web/src/pages/chat-page.test.tsx`

- [ ] Mock `createChat` with a successful default response.
- [ ] Add tests for no initial service call, no initial conversation/composer, successful creation, pending duplicate prevention, and failure UI.
- [ ] Run the page test and confirm failures reflect the old local creation behavior.

### Task 2: Implement Async New Chat Lifecycle

**Files:**
- Modify: `apps/web/src/components/chat/use-chat-controller.ts`
- Modify: `apps/web/src/components/chat/chat-view.tsx`
- Modify: `apps/web/src/components/chat/chat-sidebar.tsx`
- Modify: `apps/web/src/components/chat/chat-helpers.ts`
- Modify: `apps/web/src/components/chat/chat-helpers.test.ts`
- Modify: `apps/web/src/components/chat/chat-config.ts`

- [ ] Start with an empty conversation list and optional active conversation.
- [ ] Remove seed configuration and local conversation creation.
- [ ] Add `isCreatingChat`, `createChatError`, and asynchronous `handleNewChat` using `createChat()`.
- [ ] Disable the button while pending and render an accessible error.
- [ ] Render a clean composer-free workspace until a chat exists.
- [ ] Make final-chat deletion return to the clean empty state.
- [ ] Run focused and complete web tests, build, lint, formatter, and `git diff --check`.
