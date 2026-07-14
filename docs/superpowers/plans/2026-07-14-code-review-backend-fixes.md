# Backend Integrity Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix conversation integrity, rulebook/vector lifecycle consistency, persistence-aware readiness, and cross-driver rulebook ordering.

**Architecture:** Preserve existing service/repository boundaries while adding typed not-found behavior, document-scoped vector deletion, and an injected readiness check. Use a forward-only migration for referential integrity and compensation where vector ingestion and PDF persistence meet.

**Tech Stack:** TypeScript 6, Express 5, Vitest, PostgreSQL 17 with pgvector, LangChain vector stores, Docker Compose.

## Global Constraints

- Work directly on `master`; do not create a worktree.
- Keep `GET /health` dependency-free and add `GET /ready` for persistence readiness.
- Do not silently delete pre-existing orphan conversation messages during migration.
- Preserve successful endpoint response bodies.
- Add regression tests before each production change.

---

### Task 1: Reject retrieval for missing conversations

**Files:**
- Create: `apps/api/src/domain/conversation/conversation-errors.ts`
- Modify: `apps/api/src/application/retrieval/retrieval-service.ts`
- Modify: `apps/api/src/presentation/http/retrieval/retrieval-router.ts`
- Test: `apps/api/tests/retrieval-service.test.ts`
- Test: `apps/api/tests/http-routers.test.ts`

**Interfaces:**
- Produces: `ConversationNotFoundError extends Error` with `conversationId`.
- Changes: `RetrievalService.search()` fails before side effects when `getChat()` returns `null`.
- Changes: `RetrievalRouter` maps that error to HTTP 404 and `{ error: "Conversation not found" }`.

- [ ] Write a service test using an empty conversation repository. Assert `search()` rejects with `ConversationNotFoundError` and no vector/public searches occur. Update existing happy paths to create a conversation first.
- [ ] Run `npm test -w api -- tests/retrieval-service.test.ts`; verify the new test fails because a conversation is synthesized.
- [ ] Add the error and replace the fallback with:

```ts
if (!storedConversation) {
  throw new ConversationNotFoundError(conversationId);
}
```

- [ ] Re-run the retrieval test and require it to pass.
- [ ] Add a router test for the 404 mapping and run `npm test -w api -- tests/http-routers.test.ts`; verify RED.
- [ ] Add the typed catch branch, retaining generic `next(error)`, then re-run and require GREEN.

### Task 2: Enforce conversation-message referential integrity

**Files:**
- Create: `apps/api/migrations/0004_conversation_message_foreign_key.sql`
- Modify: `apps/api/src/infrastructure/database/migrations.ts`
- Modify: `apps/api/src/infrastructure/persistence/conversation/postgres-conversation-repository.ts`
- Test: `apps/api/tests/database/migrations.test.ts`
- Test: `apps/api/tests/database/persistence.test.ts`
- Test: `apps/api/tests/postgres-conversation-repository.test.ts`

**Interfaces:**
- Produces: `conversation_messages.conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE`.
- Changes: conversation deletion relies on the cascade.

- [ ] Add integration assertions for migration version `0004_conversation_message_foreign_key`, UUID column type, foreign-key rejection code `23503`, and cascading deletion.
- [ ] Run the two database tests with `TEST_DATABASE_URL`; verify RED because migration 0004 is absent.
- [ ] Add and register this migration:

```sql
ALTER TABLE conversation_messages
  ALTER COLUMN conversation_id TYPE UUID USING conversation_id::UUID;
ALTER TABLE conversation_messages
  ADD CONSTRAINT conversation_messages_conversation_id_fkey
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE;
```

- [ ] Re-run database tests and require GREEN. Invalid UUID or orphan data must make migration fail visibly.
- [ ] Change the repository deletion unit test to expect only parent deletion, verify RED, remove explicit child deletion, and re-run `tests/postgres-conversation-repository.test.ts` for GREEN.

### Task 3: Add document-scoped vector deletion

**Files:**
- Modify: `apps/api/src/infrastructure/rag/vector-store/vector-store.ts`
- Modify: `apps/api/src/infrastructure/rag/vector-store/langchain-memory-vector-store.ts`
- Modify: `apps/api/src/infrastructure/database/vector/langchain-pg-vector-store.ts`
- Modify: vector-store test doubles
- Test: `apps/api/tests/rag/langchain-memory-vector-store.test.ts`
- Test: `apps/api/tests/database/langchain-pg-vector-store.test.ts`

**Interfaces:**
- Produces: `VectorStore.deleteByDocumentId(documentId: string): Promise<void>`.

- [ ] In both adapter suites, insert two document IDs, delete one, and assert searches retain only the other. Run both suites with `TEST_DATABASE_URL`; verify RED.
- [ ] Add `deleteByDocumentId` to the interface and no-op implementations to test doubles.
- [ ] In memory, filter `vectorStore.memoryVectors` by metadata ID. In PostgreSQL, call:

```ts
await this.vectorStore.delete({ filter: { documentId } });
```

- [ ] Re-run both adapter suites and require GREEN.

### Task 4: Coordinate rulebook persistence and vector cleanup

**Files:**
- Modify: `apps/api/src/domain/rulebook/rulebook-repository.ts`
- Modify: both rulebook repository implementations
- Modify: `apps/api/src/presentation/http/ingestion/ingestion-router.ts`
- Modify: `apps/api/src/main.ts`
- Test: repository tests and `apps/api/tests/http-routers.test.ts`

**Interfaces:**
- Produces: `RulebookRepository.getById(id: string): Promise<RulebookRecord | null>`.
- Changes: `IngestionRouter` receives `VectorStore`.
- Changes: upload compensates vectors after post-ingestion failure; deletion checks existence, deletes vectors, then deletes the record.

- [ ] Write found/missing lookup tests for both drivers. PostgreSQL must select metadata without `pdf_data`. Run repository tests and verify RED.
- [ ] Implement `getById` in both drivers; re-run repository tests for GREEN.
- [ ] Add upload tests asserting failed PDF save invokes `deleteByDocumentId` before forwarding the original error, and dual failure forwards:

```ts
new AggregateError(
  [originalError, cleanupError],
  "Rulebook upload and vector cleanup failed",
)
```

- [ ] Add delete tests asserting missing records do not touch vectors; existing records call lookup, vector deletion, then relational deletion; vector failure leaves the row untouched. Run router tests and verify RED.
- [ ] Inject `VectorStore`, track successful ingestion, implement compensation and coordinated deletion, and wire `vectorStore` from `main.ts`.
- [ ] Re-run `npm test -w api -- tests/http-routers.test.ts` and require GREEN.

### Task 5: Add persistence-aware readiness

**Files:**
- Modify: `apps/api/src/presentation/http/health/health-router.ts`
- Modify: health schema/types as required
- Modify: `apps/api/src/main.ts`
- Modify: `apps/api/Dockerfile`
- Modify: `apps/api/openapi.yml`
- Test: `apps/api/tests/http-routers.test.ts`

**Interfaces:**
- Changes: `new HealthRouter(readinessCheck: () => Promise<void>)`.
- Produces: `GET /ready`, returning the health body on success or HTTP 503 with `{ error: "Service unavailable" }` on dependency failure.

- [ ] Write healthy/unavailable `/ready` handler tests while retaining synchronous `/health`; run router tests and verify RED.
- [ ] Inject `persistence.healthCheck`, register `/ready`, and catch readiness failures locally as 503.
- [ ] Document `/ready` in OpenAPI and change the Docker health URL from `/health` to `/ready`.
- [ ] Re-run router tests and require GREEN.

### Task 6: Align in-memory rulebook ordering

**Files:**
- Modify: `apps/api/src/infrastructure/persistence/rulebook/in-memory-rulebook-repository.ts`
- Test: `apps/api/tests/rulebook-repository.test.ts`

**Interfaces:**
- Changes: `list()` returns newest saves first; re-saving an ID makes it newest.

- [ ] Save Catan then Pandemic and expect `[Pandemic, Catan]`; re-save Catan and expect `[Catan, Pandemic]`. Run the test and verify RED.
- [ ] Delete an existing map entry before `set`; reverse values in `list()`.
- [ ] Re-run the repository test and require GREEN.

### Task 7: Format and complete verification

**Files:**
- Modify as needed: files changed by Prettier only.

**Interfaces:**
- Consumes all prior tasks and produces a verified repository state.

- [ ] Run `npm run format`; require exit 0 and review formatter changes.
- [ ] Run `env TEST_DATABASE_URL=postgresql://board_game_rules:board_game_rules@127.0.0.1:55432/board_game_rules npm test`; require zero failures.
- [ ] Run `npm run typecheck`, `npm run lint -w api`, `npm run lint -w web`, `npm run build`, `docker compose config --quiet`, and `git diff --check`; require exit 0 for every command.
- [ ] Review `git status --short`, `git diff --stat`, and `git diff`; confirm only approved fixes, tests, migration, API documentation, Docker readiness, and planning documentation changed.
