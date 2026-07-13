# Web Create Chat Service Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a typed bodyless `POST /chats` web API client with success and error coverage.

**Architecture:** A feature-specific service module uses the shared `API_BASE_URL`, mirrors the API response contract with exported TypeScript types, and follows the existing fetch error convention.

**Tech Stack:** TypeScript, Fetch API, Vitest

## Global Constraints

- Send no request body and no `Content-Type` header.
- Do not connect the service to React state in this task.
- Preserve the existing `{ error?: string }` error handling convention.

---

### Task 1: Add Create Chat Client and Tests

**Files:**
- Create: `apps/web/src/api/chat-service.ts`
- Modify: `apps/web/src/api/api.test.ts`

- [ ] Add a failing test that imports `createChat`, asserts the response, and verifies `fetch` receives the `/chats` URL with exactly `{ method: "POST" }`.
- [ ] Add `createChat` cases to the readable-error and unreadable-error parameterized tests.
- [ ] Run `npm test -w web -- src/api/api.test.ts` and confirm failure because `chat-service.ts` is absent.
- [ ] Implement `ChatSummary`, `CreateChatResponse`, and `createChat()`.
- [ ] Run the focused test and then the complete web test suite.
- [ ] Run the web build, lint, registered formatter, and `git diff --check`.
