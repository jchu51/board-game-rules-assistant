# Persisted Rulebook Delete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Delete persisted rulebook metadata and PDF bytes through `DELETE /rulebooks/:id` and remove PostgreSQL's memory delegate.

**Architecture:** Make repository deletion asynchronous. PostgreSQL maps the affected-row count from a parameterized `DELETE`, while memory mode provides the same contract. The router awaits deletion and forwards errors without changing HTTP responses.

**Tech Stack:** TypeScript, Express, PostgreSQL, `pg`, Vitest.

## Global Constraints

- Delete the `rulebooks` row and its embedded PDF only.
- Do not delete vectors or add PDF retrieval.
- Preserve 204 and 404 behavior.
- Remove all memory delegation from `PostgresRulebookRepository`.

---

### Task 1: Repository Deletion

**Files:**
- Modify: `apps/api/src/domain/rulebook/rulebook-repository.ts`
- Modify: `apps/api/src/infrastructure/persistence/rulebook/in-memory-rulebook-repository.ts`
- Modify: `apps/api/src/infrastructure/persistence/rulebook/postgres-rulebook-repository.ts`
- Modify: `apps/api/tests/rulebook-repository.test.ts`
- Modify: `apps/api/tests/postgres-rulebook-repository.test.ts`

- [ ] **Step 1: Write failing tests**

Require `deleteById()` to resolve booleans. Verify PostgreSQL calls
`DELETE FROM rulebooks WHERE id = $1` with the requested id and maps `rowCount`
of one to `true` and zero to `false`.

- [ ] **Step 2: Verify RED**

Run `npm test -w api -- tests/rulebook-repository.test.ts tests/postgres-rulebook-repository.test.ts`.

- [ ] **Step 3: Implement repository deletion**

Make the contract and memory implementation async. Delete the PostgreSQL memory
delegate and issue the parameterized database delete directly.

- [ ] **Step 4: Verify GREEN**

Rerun Step 2 and expect PASS.

### Task 2: HTTP Deletion

**Files:**
- Modify: `apps/api/src/presentation/http/ingestion/ingestion-router.ts`
- Modify: `apps/api/tests/http-routers.test.ts`

- [ ] **Step 1: Write failing router tests**

Await successful and missing deletions. Add a repository rejection test and
verify the error is passed to `next`.

- [ ] **Step 2: Verify RED**

Run `npm test -w api -- tests/http-routers.test.ts`.

- [ ] **Step 3: Implement async deletion**

Await `deleteById`, return the existing 204 or 404 response, and forward caught
errors to Express middleware.

- [ ] **Step 4: Verify GREEN**

Rerun Step 2 and expect PASS.

### Task 3: Documentation and Verification

**Files:**
- Modify: `apps/api/openapi.yml`
- Modify: `apps/api/README.md`
- Modify: `apps/packages/database/README.md`

- [ ] **Step 1: Document persisted deletion**

State that delete removes the database row and PDF while vectors remain.

- [ ] **Step 2: Format and verify**

Run formatting, full tests, typecheck, build, API lint, database tests, and
`git diff --check`.

- [ ] **Step 3: Commit and live-check**

Commit, restart the API, verify health, and stop before vector deletion or PDF
retrieval.
