# Durable API Composition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make PostgreSQL-default API composition durable and runnable end-to-end while preserving the current HTTP contract.

**Architecture:** Extend the database deep module only with persistence primitives required by the API, then place actor, ingestion lifecycle, and conversation compatibility rules in API application services. HTTP adapters parse requests and delegate; `main.ts` owns startup/shutdown composition.

**Tech Stack:** TypeScript, Express, Zod, Drizzle ORM, PostgreSQL/pgvector, Node test runner.

## Global Constraints

- PostgreSQL is the default driver; memory is allowed only in local/test.
- Local fallback actor is a configured persisted Standard user; no fallback in development/production.
- Uploaded PDFs remain temporary.
- Preserve current HTTP response bodies and explicit pre-auth `gameId` retrieval input.
- Tests must demonstrate RED before production edits and use live PostgreSQL for integration coverage.

---

### Task 1: Persistence primitives

**Files:** database models, repositories, schema, tracked migration, memory/postgres adapters, contract tests.

**Interfaces:** Extend user/conversation creation with optional IDs; add `resolveGame`, `listOwnedDocuments`, and persisted `fileSizeBytes`.

- [ ] Write failing memory and PostgreSQL contract tests for stable user IDs, idempotent games, owner listing, file size, and requested conversation IDs.
- [ ] Run focused contracts and confirm failures are missing interface/column behavior.
- [ ] Add domain fields and repository methods, tracked migration, and both adapters.
- [ ] Run memory and live PostgreSQL contracts to GREEN.

### Task 2: Driver and actor boundaries

**Files:** API config schema/types/tests; new actor resolver/bootstrap application modules and tests.

**Interfaces:** `bootstrapLocalUser(identity, config)` and `resolveActor(headers, options): Promise<Actor>`.

- [ ] Write failing tests for development-memory rejection, local bootstrap idempotency, local fallback, persisted headers, ambiguous headers, and guest upload rejection.
- [ ] Run focused tests to RED.
- [ ] Implement config and actor boundaries without HTTP business rules.
- [ ] Run focused tests to GREEN.

### Task 3: Durable ingestion and library routes

**Files:** ingestion service/router/schema tests and composition integration tests.

**Interfaces:** `ingestUpload({actor, gameName, file...})`, `listRulebooks(actor)`, `deleteRulebook(actor,id)`.

- [ ] Write failing unit tests for version metadata, activation, failure marking, listing, deletion, and temporary-file cleanup.
- [ ] Write a failing live PostgreSQL integration for upload metadata/version/chunk persistence and soft deletion.
- [ ] Implement orchestration and async router delegation.
- [ ] Run unit and live integration tests to GREEN.

### Task 4: Persisted retrieval conversations

**Files:** retrieval service/router tests and conversation compatibility adapter.

**Interfaces:** Async history/append operations backed by `persistence.conversations`, creating a requested conversation ID only when absent.

- [ ] Write failing service tests for actor-owned history, first-use creation, wrong-owner rejection, and durable message append.
- [ ] Convert retrieval composition to async persisted conversations and pass actor from the router.
- [ ] Run focused retrieval tests to GREEN.

### Task 5: Lifecycle composition and verification

**Files:** `main.ts`, composition helpers/tests, report.

**Interfaces:** Health before bootstrap/listen; persistence close once after server close.

- [ ] Write failing lifecycle ordering/close tests around an extracted API startup function.
- [ ] Remove legacy repository construction and wire persistence/actor services.
- [ ] Run all API/database tests, live PostgreSQL tests, typecheck, build, and diff checks.
- [ ] Append exact RED/GREEN and environment evidence to the Task 4 report and commit.
