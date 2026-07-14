# Move Database Package into API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the database workspace package and make its PostgreSQL infrastructure an internal API module without changing behavior.

**Architecture:** Place migrations, pool creation, and the pgvector adapter under the API. Keep `rag-core` contracts unchanged. Copy SQL files into the API bundle and run the former database integration tests from the API project.

**Tech Stack:** TypeScript, Express, PostgreSQL, pgvector, LangChain, Vitest, npm workspaces.

## Global Constraints

- Move only the database package.
- Do not move `rag-core` or `agent-core`.
- Do not change schemas, migrations, routes, or persistence behavior.
- Preserve source-mode and compiled migration loading.

---

### Task 1: Move Database Tests and Infrastructure

**Files:**
- Create: `apps/api/tests/database/test-database.ts`
- Create: `apps/api/tests/database/migrations.test.ts`
- Create: `apps/api/tests/database/persistence.test.ts`
- Create: `apps/api/tests/database/langchain-pg-vector-store.test.ts`
- Create: `apps/api/src/infrastructure/database/migrations.ts`
- Create: `apps/api/src/infrastructure/database/persistence.ts`
- Create: `apps/api/src/infrastructure/database/vector/langchain-pg-vector-store.ts`
- Create: `apps/api/migrations/0001_conversation_messages.sql`
- Create: `apps/api/migrations/0002_conversations.sql`
- Create: `apps/api/migrations/0003_rulebooks.sql`

**Interfaces:**
- Produces: local `createPostgresPersistence`, `runMigrations`, and `LangchainPgVectorStoreAdapter` with their existing signatures.

- [ ] **Step 1: Move tests with local imports and verify RED**

Copy the existing database tests under `apps/api/tests/database`, changing source
imports to `../../src/infrastructure/database/...`. Run:

```bash
TEST_DATABASE_URL=postgresql://board_game_rules:board_game_rules@127.0.0.1:55432/board_game_rules npm test -w api -- tests/database
```

Expected: FAIL because local database infrastructure files do not exist.

- [ ] **Step 2: Move infrastructure and migrations**

Copy the implementation and SQL files into the target paths. Update migration
URL resolution so source execution reads `apps/api/migrations` and bundled
execution reads `apps/api/dist/migrations`.

- [ ] **Step 3: Verify GREEN**

Rerun Step 1 and expect all moved database tests to pass.

### Task 2: Rewire the API and Build

**Files:**
- Modify: `apps/api/src/infrastructure/persistence/create-persistence.ts`
- Modify: `apps/api/package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Write the local import and verify build RED**

Replace the package import with
`../database/persistence`. Remove the internal database dependency before adding
its external dependency. Run `npm run typecheck -w api`; expect dependency or
module resolution failure.

- [ ] **Step 2: Complete dependency and build wiring**

Add `@langchain/community` version `0.3.57` to API dependencies. Extend the API
build command with `cp -R migrations dist/migrations`. Run `npm install` to
regenerate the lockfile.

- [ ] **Step 3: Verify source and compiled output**

Run `npm run typecheck -w api`, `npm run build -w api`, and verify
`apps/api/dist/migrations/0003_rulebooks.sql` exists.

### Task 3: Remove the Workspace Package

**Files:**
- Delete: `apps/packages/database/**`
- Modify: `apps/api/README.md`
- Modify: repository documentation that names the database package as current architecture.

- [ ] **Step 1: Remove old files after local consumers pass**

Delete the database package source, tests, migrations, README, TypeScript/Vitest
configuration, and package manifest.

- [ ] **Step 2: Prove no current import remains**

Run:

```bash
rg '@board-game-rules-assistant/database|apps/packages/database' apps package.json package-lock.json
```

Expected: no current code, manifest, or lockfile matches. Historical design docs
may retain references as history.

- [ ] **Step 3: Update documentation**

Move PostgreSQL setup, test command, migration ownership, PDF storage, and
pgvector limitations into the API README. Update source layout documentation.

### Task 4: Full Verification and Commit

- [ ] **Step 1: Format and restore unrelated changes**

Run `npm run format`, retain only consolidation-related changes, and run
`git diff --check`.

- [ ] **Step 2: Run full verification**

Run `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w api`, and
the moved database tests with `TEST_DATABASE_URL`.

- [ ] **Step 3: Commit and smoke-test**

Commit the move, start the API, verify `/health`, and verify the compiled API can
run migrations. Stop before moving another package.
