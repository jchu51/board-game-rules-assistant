# Persisted Rulebook List Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `GET /rulebooks` return persisted rulebook metadata through the selected `RulebookRepository` without loading PDF bytes.

**Architecture:** Make repository listing asynchronous, implement metadata-only PostgreSQL listing, and make the HTTP handler await and forward errors. Keep the response schema and every non-list operation unchanged.

**Tech Stack:** TypeScript, Express, PostgreSQL, `pg`, Zod, Vitest.

## Global Constraints

- Change `GET /rulebooks` only.
- Do not select `pdf_data` or `mime_type`.
- Do not modify delete, vectors, PDF retrieval, or frontend behavior.
- Preserve the existing response schema.
- Order PostgreSQL results by `created_at DESC, id DESC`.

---

### Task 1: Asynchronous Repository Listing

**Files:**
- Modify: `apps/api/src/domain/rulebook/rulebook-repository.ts`
- Modify: `apps/api/src/infrastructure/persistence/rulebook/in-memory-rulebook-repository.ts`
- Modify: `apps/api/tests/rulebook-repository.test.ts`
- Modify: `apps/api/src/infrastructure/persistence/rulebook/postgres-rulebook-repository.ts`
- Modify: `apps/api/tests/postgres-rulebook-repository.test.ts`

**Interfaces:**
- Produces: `RulebookRepository.list(): Promise<RulebookRecord[]>`.

- [ ] **Step 1: Write failing repository tests**

Change the memory assertion to `await expect(repository.list()).resolves...`.
Mock PostgreSQL rows, call `await repository.list()`, and expect mapped camel-case
metadata plus this query shape:

```sql
SELECT id, game_name, pdf_name, file_size
FROM rulebooks
ORDER BY created_at DESC, id DESC
```

- [ ] **Step 2: Verify RED**

Run `npm test -w api -- tests/rulebook-repository.test.ts tests/postgres-rulebook-repository.test.ts`.
Expected: FAIL because list is synchronous and PostgreSQL delegates to memory.

- [ ] **Step 3: Implement both repository methods**

Change the contract and in-memory implementation to async. In PostgreSQL, query
only the four metadata columns and map snake-case rows to `RulebookRecord`.

- [ ] **Step 4: Verify GREEN**

Rerun Step 2 and expect both files to pass.

### Task 2: Await Listing in the HTTP Router

**Files:**
- Modify: `apps/api/src/presentation/http/ingestion/ingestion-router.ts`
- Modify: `apps/api/tests/http-routers.test.ts`

**Interfaces:**
- Consumes: `RulebookRepository.list(): Promise<RulebookRecord[]>`.
- Produces: unchanged `GET /rulebooks` JSON and error forwarding.

- [ ] **Step 1: Write failing router tests**

Await `listRulebooks` in the success test. Add a test whose repository `list`
rejects with `new Error("list failed")` and verify `next` receives that error.

- [ ] **Step 2: Verify RED**

Run `npm test -w api -- tests/http-routers.test.ts`.
Expected: FAIL because the handler neither awaits nor catches the rejection.

- [ ] **Step 3: Implement the async handler**

Accept `next`, await the repository, validate the existing schema, return HTTP
200, and call `next(error)` from `catch`.

- [ ] **Step 4: Verify GREEN**

Rerun Step 2 and expect PASS.

### Task 3: Documentation and Verification

**Files:**
- Modify: `apps/api/openapi.yml`
- Modify: `apps/api/README.md`
- Modify: `apps/packages/database/README.md`

- [ ] **Step 1: Document persisted metadata listing**

Remove process-local list wording and state that listing excludes PDF content.
Keep delete documented as process-local.

- [ ] **Step 2: Format and verify**

Run `npm run format`, restore unrelated formatter changes, then run `npm test`,
`npm run typecheck`, `npm run build`, `npm run lint -w api`, the database suite
with `TEST_DATABASE_URL`, and `git diff --check`.

- [ ] **Step 3: Commit and stop**

Commit the endpoint phase, restart the API, verify `/health`, and stop before
implementing delete or PDF retrieval.
