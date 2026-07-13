# Retrieval Conversation Title Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate and persist a stable title from the first retrieval question and flatten chat navigation.

**Architecture:** A focused agent-core title agent returns validated JSON containing only a title. Retrieval applies the first-question-only lifecycle through a repository `updateTitle` operation. The web client consumes the returned title while retaining its existing local board-game behavior.

**Tech Stack:** TypeScript, LangChain, Express, Zod, PostgreSQL, React, Vitest, React Testing Library, OpenAPI YAML

## Global Constraints

- Generate a title only for the first question and preserve it afterward.
- `POST /retrieval/search` returns exactly `title`, `answer`, and `matches`.
- Title generation failure must not block retrieval or message persistence.
- Do not add or persist conversation board-game metadata.
- Render chat navigation as one flat section without group headings.

---

### Task 1: Add the title agent

- [ ] Write failing agent and prompt tests for `{ "title": string }` output.
- [ ] Implement `ConversationTitleAgent` and `conversationTitlePrompt`.
- [ ] Run the selected agent-core tests and commit.

### Task 2: Persist titles

- [ ] Write failing in-memory and PostgreSQL repository tests for `updateTitle`.
- [ ] Add `updateTitle(conversationId, title)` to the repository contract and implementations.
- [ ] Run repository tests and commit.

### Task 3: Apply the retrieval lifecycle

- [ ] Write failing tests for first-question generation, follow-up preservation, and failure fallback.
- [ ] Add `title` to retrieval results and invoke title generation only for empty conversations.
- [ ] Persist changed titles and wire the title agent in API startup.
- [ ] Run retrieval tests and commit.

### Task 4: Update contracts and web behavior

- [ ] Require title in retrieval runtime/OpenAPI schemas while rejecting extra properties.
- [ ] Update the web retrieval client and controller to use the returned title.
- [ ] Retain existing client-local board-game detection.
- [ ] Run API and web contract tests and commit.

### Task 5: Flatten navigation and verify

- [ ] Replace grouped chat navigation with a heading-free conversation list.
- [ ] Run formatter, full tests, typechecks, builds, lint, database tests, Docker config validation, and `git diff --check`.
- [ ] Commit verified changes.
