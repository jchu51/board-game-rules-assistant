# PostgreSQL and pgvector Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add portable PostgreSQL/pgvector persistence for the rulebook library, tier policies, conversations, citations, and authorized retrieval while retaining a complete in-memory driver.

**Architecture:** Add a focused `@board-game-rules-assistant/database` workspace that defines persistence contracts and supplies memory and PostgreSQL adapters. Keep business rules in API application services, keep `rag-core` storage-agnostic, and select the adapter composition at API startup with `PERSISTENCE_DRIVER`.

**Tech Stack:** TypeScript 6, Node.js 22 test runner, Drizzle ORM/Kit, `postgres` driver, PostgreSQL with pgvector, Docker Compose, Zod, Express 5.

## Global Constraints

- Normal local development uses `PERSISTENCE_DRIVER=postgres`; lightweight local/test runs may use `memory`.
- Production must refuse to start with the memory driver.
- PostgreSQL and memory adapters must pass the same contract suite.
- Store metadata, chunks, embeddings, conversations, messages, and citations; do not store PDF bytes.
- Guest policy: `topK=3`, zero uploads, seven-day conversation retention.
- Standard policy: `topK=5`, three total active private PDFs.
- Pro policy: `topK=8`, unlimited private PDFs.
- Admin is an account role, not a plan tier, and overrides retrieval to `topK=10`.
- Retrieval searches published global sources plus the current user's active private sources for one selected game.
- Begin with exact cosine search; do not add HNSW in this implementation.
- Preserve all unrelated worktree changes and commit only files listed in each task.

---

## Planned File Structure

```text
apps/packages/database/
  drizzle.config.ts                 # Drizzle CLI configuration
  package.json                      # workspace scripts and dependencies
  tsconfig.json
  src/
    index.ts                        # public package exports only
    domain/
      models.ts                     # persistence records and enums
      errors.ts                     # typed persistence/domain errors
      repositories.ts              # narrow persistence contracts
    memory/
      memory-database.ts            # shared in-memory state and adapters
    postgres/
      client.ts                     # pool creation and lifecycle
      schema.ts                     # Drizzle tables, constraints, indexes
      repositories.ts              # PostgreSQL repository implementations
      vector-store.ts               # pgvector implementation of VectorStore
      health.ts                     # extension/migration/dimension checks
    composition.ts                  # driver selection and Persistence bundle
  drizzle/                          # generated SQL migrations and metadata
  tests/
    contract-suite.ts               # reusable adapter behavior tests
    memory-contract.test.ts
    postgres-contract.test.ts
    migrations.test.ts
    postgres-test-database.ts
    tsconfig.json

apps/api/src/
  application/
    access/access-policy-service.ts
    conversations/conversation-service.ts
    ingestion/ingestion-service.ts
    library/library-service.ts
    retrieval/retrieval-service.ts
  domain/
    identity/actor.ts
    persistence/persistence-errors.ts
  presentation/http/
    middleware/actor-middleware.ts
    admin/admin-library-router.ts
    conversations/conversation-router.ts
  main.ts
```

Existing thin repository files under `apps/api/src/domain/{rulebook,conversation}` and their in-memory implementations are removed only after callers use the database package contracts.

---

### Task 1: Database workspace and persistence contracts

**Files:**
- Create: `apps/packages/database/package.json`
- Create: `apps/packages/database/tsconfig.json`
- Create: `apps/packages/database/src/domain/models.ts`
- Create: `apps/packages/database/src/domain/errors.ts`
- Create: `apps/packages/database/src/domain/repositories.ts`
- Create: `apps/packages/database/src/index.ts`
- Create: `apps/packages/database/tests/tsconfig.json`
- Create: `apps/packages/database/tests/contract-suite.ts`
- Create: `apps/packages/database/tests/memory-contract.test.ts`
- Modify: `.gitignore`

**Interfaces:**
- Produces: `Persistence`, `LibraryRepository`, `ConversationRepository`, `PolicyRepository`, `VectorStore`, `Actor`, and the record/input types used by every later task.
- Consumes: `VectorStore` and `RulebookDocumentInterface` from `@board-game-rules-assistant/rag-core`.

- [ ] **Step 1: Ignore visual-companion state**

Add this exact line to `.gitignore`:

```gitignore
.superpowers/
```

- [ ] **Step 2: Create the package manifest and TypeScript configuration**

```json
{
  "name": "@board-game-rules-assistant/database",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": { ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" } },
  "scripts": {
    "build": "rm -rf dist && tsc",
    "typecheck": "tsc --noEmit",
    "test": "tsc --noEmit -p tests/tsconfig.json && node --import tsx --test tests/*.test.ts"
  },
  "dependencies": {
    "@board-game-rules-assistant/rag-core": "^0.1.0"
  },
  "devDependencies": {
    "@types/node": "^24.13.2",
    "tsx": "^4.23.0",
    "typescript": "^6.0.3"
  }
}
```

Use the same compiler options as `apps/packages/rag-core/tsconfig.json`, changing only `rootDir` to `src` and `outDir` to `dist`.

- [ ] **Step 3: Write the failing memory contract test**

Define `runPersistenceContract(name, createPersistence)` in `contract-suite.ts`. Its first tests must assert seeded policies and isolation:

```ts
export const runPersistenceContract = (
  name: string,
  createPersistence: () => Promise<Persistence>,
) => {
  describe(name, () => {
    test("returns seeded tier policies", async () => {
      const persistence = await createPersistence();
      assert.deepEqual(await persistence.policies.getTierPolicy("guest"), {
        tier: "guest",
        retrievalTopK: 3,
        privateUploadLimit: 0,
        conversationTtlDays: 7,
      });
      assert.equal((await persistence.policies.getTierPolicy("standard")).privateUploadLimit, 3);
      assert.equal((await persistence.policies.getTierPolicy("pro")).privateUploadLimit, null);
      await persistence.close();
    });

    test("never returns another owner's private document", async () => {
      const persistence = await createPersistence();
      const game = await persistence.library.createGame({ name: "Catan", slug: "catan" });
      const alice = await persistence.identity.createUser({ email: "alice@example.com", displayName: "Alice", accountRole: "user", planTier: "standard" });
      const bob = await persistence.identity.createUser({ email: "bob@example.com", displayName: "Bob", accountRole: "user", planTier: "standard" });
      await persistence.library.createDocument({ gameId: game.id, ownerId: alice.id, visibility: "private", kind: "base_rules", title: "Alice rules" });
      assert.equal((await persistence.library.listRetrievableDocuments({ gameId: game.id, userId: bob.id })).length, 0);
      await persistence.close();
    });
  });
};
```

`memory-contract.test.ts` calls the suite with `createMemoryPersistence()`.

- [ ] **Step 4: Run the test and verify it fails**

Run: `npm test -w @board-game-rules-assistant/database`

Expected: FAIL because the domain types and `createMemoryPersistence` do not exist.

- [ ] **Step 5: Define the contracts and models**

Define these exact public shapes in `models.ts` and `repositories.ts`:

```ts
export type AccountRole = "user" | "admin";
export type PlanTier = "standard" | "pro";
export type PolicyTier = "guest" | PlanTier;
export type Actor =
  | { kind: "guest"; guestSessionId: string }
  | { kind: "user"; userId: string; accountRole: AccountRole; planTier: PlanTier };

export type Persistence = {
  identity: IdentityRepository;
  policies: PolicyRepository;
  library: LibraryRepository;
  conversations: ConversationRepository;
  vectorStore: VectorStore;
  healthCheck(): Promise<void>;
  close(): Promise<void>;
};
```

Repository methods must be asynchronous and accept object parameters. Include the methods exercised here and later: `createUser`, `getUserById`, `createGuestSession`, `getGuestSession`, `getTierPolicy`, `createGame`, `getGameById`, `createDocument`, `countActivePrivateDocuments`, `listRetrievableDocuments`, `createVersion`, `markVersionFailed`, `replaceActivePrivateVersion`, `publishGlobalVersion`, `softDeleteDocument`, `createConversation`, `getOwnedConversation`, `listMessages`, `appendUserMessage`, and `appendAssistantMessageWithCitations`.

- [ ] **Step 6: Add the minimal memory implementation**

Implement maps and arrays in `memory/memory-database.ts`. Clone records on input/output, seed the three policy rows, enforce owner filtering, and make `close` and `healthCheck` resolved no-ops.

- [ ] **Step 7: Run the contract and workspace checks**

Run: `npm test -w @board-game-rules-assistant/database && npm run typecheck`

Expected: all database contract tests and workspace typechecks PASS.

- [ ] **Step 8: Commit**

```bash
git add .gitignore apps/packages/database package-lock.json
git commit -m "feat: define persistence contracts and memory driver"
```

---

### Task 2: PostgreSQL schema and migrations

**Files:**
- Modify: `apps/packages/database/package.json`
- Create: `apps/packages/database/drizzle.config.ts`
- Create: `apps/packages/database/src/postgres/schema.ts`
- Create: `apps/packages/database/drizzle/0000_initial_persistence.sql`
- Create: `apps/packages/database/tests/postgres-test-database.ts`
- Create: `apps/packages/database/tests/migrations.test.ts`
- Modify: `docker-compose.yml`

**Interfaces:**
- Consumes: model enums and invariants from Task 1.
- Produces: exported Drizzle tables and a migrated PostgreSQL test database.

- [ ] **Step 1: Add Drizzle/PostgreSQL dependencies**

Run:

```bash
npm install -w @board-game-rules-assistant/database drizzle-orm postgres
npm install -D -w @board-game-rules-assistant/database drizzle-kit
```

Add scripts `db:generate`, `db:migrate`, and `db:check` using `drizzle-kit generate`, a TypeScript migration runner, and `drizzle-kit check` respectively.

- [ ] **Step 2: Write the failing migration test**

```ts
test("migration creates vector extension, tables, constraints, and policies", async () => {
  const database = await createPostgresTestDatabase();
  const extensions = await database.sql`select extname from pg_extension where extname = 'vector'`;
  assert.equal(extensions.length, 1);
  const policies = await database.sql`select tier, retrieval_top_k, private_upload_limit from tier_policies order by retrieval_top_k`;
  assert.deepEqual(policies, [
    { tier: "guest", retrieval_top_k: 3, private_upload_limit: 0 },
    { tier: "standard", retrieval_top_k: 5, private_upload_limit: 3 },
    { tier: "pro", retrieval_top_k: 8, private_upload_limit: null },
  ]);
  await database.dispose();
});
```

- [ ] **Step 3: Run the migration test and verify it fails**

Run: `docker compose up -d postgres && npm test -w @board-game-rules-assistant/database`

Expected: FAIL because the PostgreSQL service and migration do not exist.

- [ ] **Step 4: Add local PostgreSQL with pgvector**

Add this service and volume to `docker-compose.yml`:

```yaml
postgres:
  image: pgvector/pgvector:pg17
  environment:
    POSTGRES_DB: board_game_rules
    POSTGRES_USER: board_game_rules
    POSTGRES_PASSWORD: board_game_rules
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U board_game_rules -d board_game_rules"]
    interval: 5s
    timeout: 5s
    retries: 10
  ports:
    - "5432:5432"
  volumes:
    - postgres_data:/var/lib/postgresql/data
```

Make `api` depend on the healthy PostgreSQL service and set its local `DATABASE_URL` and `PERSISTENCE_DRIVER=postgres`.

- [ ] **Step 5: Define the Drizzle schema and SQL migration**

Implement every table and constraint from the approved spec. Use `vector("embedding", { dimensions: 3072 })` for the initial `text-embedding-3-large` profile. The migration must begin with:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Add unique active/published-version partial indexes, the document visibility/owner check, the conversation actor XOR check, citation foreign keys, and seeded policies. Do not add HNSW.

- [ ] **Step 6: Run migration verification**

Run:

```bash
npm run db:check -w @board-game-rules-assistant/database
npm test -w @board-game-rules-assistant/database
```

Expected: migration and policy tests PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/packages/database docker-compose.yml package-lock.json
git commit -m "feat: add postgres pgvector schema"
```

---

### Task 3: PostgreSQL adapters and shared contract suite

**Files:**
- Create: `apps/packages/database/src/postgres/client.ts`
- Create: `apps/packages/database/src/postgres/repositories.ts`
- Create: `apps/packages/database/src/postgres/vector-store.ts`
- Create: `apps/packages/database/src/postgres/health.ts`
- Create: `apps/packages/database/tests/postgres-contract.test.ts`
- Modify: `apps/packages/database/src/index.ts`
- Modify: `apps/packages/database/tests/contract-suite.ts`

**Interfaces:**
- Consumes: Task 1 repository contracts and Task 2 schema.
- Produces: `createPostgresPersistence({ databaseUrl, embeddings, expectedDimensions })`.

- [ ] **Step 1: Extend the contract suite with lifecycle and citation cases**

Add cases that create a version, activate it, fail a replacement, publish a global replacement, soft-delete a private document, create a conversation, append messages, and atomically append an assistant message with two citations. Assert that the previous active version remains after failure and disappears after successful replacement.

- [ ] **Step 2: Write the failing PostgreSQL contract entry point**

```ts
runPersistenceContract("postgres persistence", async () => {
  const testDatabase = await createPostgresTestDatabase();
  const persistence = await createPostgresPersistence({
    databaseUrl: testDatabase.databaseUrl,
    embeddings: new DeterministicEmbeddings(),
    expectedDimensions: 3072,
  });
  return { ...persistence, close: testDatabase.dispose };
});
```

Define the deterministic test double in `postgres-test-database.ts` so every query and document receives a stable 3,072-value vector:

```ts
export class DeterministicEmbeddings {
  async embedQuery(text: string): Promise<number[]> {
    const seed = [...text].reduce((sum, character) => sum + character.charCodeAt(0), 0);
    return Array.from({ length: 3072 }, (_, index) => ((seed + index) % 101) / 100);
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map((text) => this.embedQuery(text)));
  }
}
```

- [ ] **Step 3: Run and verify failure**

Run: `npm test -w @board-game-rules-assistant/database`

Expected: FAIL because `createPostgresPersistence` is not defined.

- [ ] **Step 4: Implement PostgreSQL repositories**

Use Drizzle transactions for `replaceActivePrivateVersion`, `publishGlobalVersion`, and `appendAssistantMessageWithCitations`. Every private-resource query must take `userId` and include it in SQL. Implement `countActivePrivateDocuments` as a database count over non-deleted private documents, not a count in application memory.

- [ ] **Step 5: Implement exact authorized pgvector search**

`PostgresVectorStore.similaritySearchVectorWithScore` must embed the query, join chunks → versions → documents, filter active versions, game, global-or-owner visibility, order by cosine distance, and apply the supplied server limit. Return similarity as `1 - cosine_distance` so existing relevance checks retain their meaning.

Replace the function-valued `VectorStoreFilter` boundary for PostgreSQL with a serializable scope:

```ts
export type VectorStoreScope = {
  gameId: string;
  userId?: string;
};

export type VectorStoreSimilaritySearchInput = {
  query: string;
  topK: number;
  scope: VectorStoreScope;
};
```

Update the memory vector store and its tests in the same task so both adapters implement the new contract.

- [ ] **Step 6: Implement health checks**

Check `select 1`, `pg_extension`, Drizzle migration state, and `expectedDimensions === 3072` for the production schema. Throw typed `DatabaseUnavailableError`, `MissingVectorExtensionError`, or `EmbeddingDimensionMismatchError`.

- [ ] **Step 7: Run all persistence and rag-core tests**

Run:

```bash
npm test -w @board-game-rules-assistant/rag-core
npm test -w @board-game-rules-assistant/database
npm run typecheck
```

Expected: all suites PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/packages/database apps/packages/rag-core package-lock.json
git commit -m "feat: implement postgres persistence adapters"
```

---

### Task 4: Driver configuration and API composition

**Files:**
- Create: `apps/packages/database/src/composition.ts`
- Modify: `apps/packages/database/src/index.ts`
- Modify: `apps/api/package.json`
- Modify: `apps/api/src/config/config-schema.ts`
- Modify: `apps/api/src/config/config-types.ts`
- Modify: `apps/api/src/config/config.ts`
- Modify: `apps/api/src/main.ts`
- Modify: `apps/api/.env.example`
- Modify: `apps/api/tests/config-schema.test.ts`
- Modify: `apps/api/tests/test-config.ts`

**Interfaces:**
- Consumes: `createMemoryPersistence` and `createPostgresPersistence`.
- Produces: `createPersistence({ driver, nodeEnv, databaseUrl, embeddings, expectedDimensions })` and `config.persistence`.

- [ ] **Step 1: Write failing configuration tests**

```ts
test("defaults local persistence to postgres", () => {
  assert.equal(parseEnv(validEnv).PERSISTENCE_DRIVER, "postgres");
});

test("rejects memory persistence in production", () => {
  assert.throws(() => parseEnv({ ...validEnv, NODE_ENV: "production", PERSISTENCE_DRIVER: "memory" }), /production requires postgres/);
});

test("requires DATABASE_URL for postgres", () => {
  assert.throws(() => parseEnv({ ...validEnv, PERSISTENCE_DRIVER: "postgres", DATABASE_URL: "" }), /DATABASE_URL/);
});
```

- [ ] **Step 2: Run and verify failure**

Run: `npm test -w api -- config-schema.test.ts`

Expected: FAIL because persistence fields are absent.

- [ ] **Step 3: Add configuration and package dependency**

Add `@board-game-rules-assistant/database` to API dependencies. Add `PERSISTENCE_DRIVER`, `DATABASE_URL`, and `INGESTION_EMBEDDING_DIMENSIONS` to Zod/config types. Set the example dimensions to `3072`.

- [ ] **Step 4: Implement composition and lifecycle**

In `main.ts`, create embeddings once, create persistence from configuration, await `healthCheck()` before listening, inject repositories/vector store into services, and await `persistence.close()` during SIGINT/SIGTERM shutdown.

- [ ] **Step 5: Run checks**

Run: `npm test -w api && npm run typecheck && npm run build`

Expected: all PASS with `PERSISTENCE_DRIVER=memory` in test config.

- [ ] **Step 6: Commit**

```bash
git add apps/api apps/packages/database package-lock.json
git commit -m "feat: configure persistence drivers"
```

---

### Task 5: Actors, tier policies, and private upload quotas

**Files:**
- Create: `apps/api/src/domain/identity/actor.ts`
- Create: `apps/api/src/application/access/access-policy-service.ts`
- Create: `apps/api/src/presentation/http/middleware/actor-middleware.ts`
- Create: `apps/api/tests/access-policy-service.test.ts`
- Create: `apps/api/tests/actor-middleware.test.ts`
- Modify: `apps/api/src/application/ingestion/ingestion-service.ts`
- Modify: `apps/api/src/application/ingestion/ingestion-types.ts`
- Modify: `apps/api/src/presentation/http/ingestion/ingestion-router.ts`
- Modify: `apps/api/src/presentation/http/shared/error-middleware.ts`
- Modify: `apps/api/tests/rulebook-repository.test.ts`

**Interfaces:**
- Consumes: identity, policy, and library repositories.
- Produces: `AccessPolicyService.getEffectivePolicy(actor)` and actor-scoped ingestion.

- [ ] **Step 1: Write failing policy tests**

```ts
test("returns admin topK override without changing plan quota", async () => {
  const policy = await service.getEffectivePolicy({ kind: "user", userId: "admin", accountRole: "admin", planTier: "standard" });
  assert.equal(policy.retrievalTopK, 10);
  assert.equal(policy.privateUploadLimit, 3);
});

test("rejects a fourth active Standard document", async () => {
  repository.activePrivateCount = 3;
  await assert.rejects(() => service.assertCanCreatePrivateDocument(standardActor), PlanLimitReachedError);
});
```

- [ ] **Step 2: Run and verify failure**

Run: `npm test -w api -- access-policy-service.test.ts`

Expected: FAIL because the service is missing.

- [ ] **Step 3: Implement actor resolution and policies**

Resolve a registered actor from an internal `x-user-id` development header and a guest from `x-guest-session-id`. Keep this adapter intentionally replaceable by future authentication. Reject expired guests with `GuestSessionExpiredError`. Implement exact errors `PlanLimitReachedError` and `AdminRequiredError`.

- [ ] **Step 4: Make ingestion actor-scoped and transactional**

Change `ingestPdf` input to include `actor`, `gameId`, `title`, `kind`, and optional existing `documentId`. Guests fail before PDF processing. New private documents consume quota; new versions of an owned existing document do not. Persist `processing`, `ready`, `failed`, and active transitions through repositories.

- [ ] **Step 5: Map typed errors**

Map plan limit to HTTP 403 with `{ code: "PLAN_LIMIT_REACHED", currentUsage, limit }`; expired guests to 401; unauthorized resources to 404; persistence outage to 503.

- [ ] **Step 6: Run API and contract tests**

Run: `npm test -w api && npm test -w @board-game-rules-assistant/database`

Expected: all PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/api
git commit -m "feat: enforce actor upload policies"
```

---

### Task 6: Admin global library publication

**Files:**
- Create: `apps/api/src/application/library/library-service.ts`
- Create: `apps/api/src/presentation/http/admin/admin-library-schema.ts`
- Create: `apps/api/src/presentation/http/admin/admin-library-router.ts`
- Create: `apps/api/tests/library-service.test.ts`
- Create: `apps/api/tests/admin-library-router.test.ts`
- Modify: `apps/packages/database/src/postgres/schema.ts`
- Create: `apps/packages/database/drizzle/0001_add_global_verification.sql`
- Modify: `apps/api/src/main.ts`
- Modify: `apps/api/openapi.yml`

**Interfaces:**
- Consumes: `LibraryRepository`, ingestion service, and `Actor`.
- Produces: `createGlobalDraft`, `verifyGlobalVersion`, and `publishGlobalVersion`.

- [ ] **Step 1: Write failing lifecycle tests**

Test that a normal user cannot create or publish a global document; a ready version cannot publish until verified; publishing version 2 archives version 1; a failed version leaves version 1 published.

- [ ] **Step 2: Run and verify failure**

Run: `npm test -w api -- library-service.test.ts`

Expected: FAIL because `LibraryService` is missing.

- [ ] **Step 3: Implement the service state machine**

Use these allowed transitions:

```ts
const allowedTransitions = {
  draft: ["processing"],
  processing: ["ready", "failed"],
  ready: ["published", "failed"],
  published: ["archived"],
  failed: [],
  archived: [],
} as const;
```

Record verification as `verified_at` and `verified_by` columns in a new migration. Require the same or another admin; the approved design does not require two-person approval.

- [ ] **Step 4: Add admin endpoints and OpenAPI schemas**

Add `POST /admin/games/:gameId/documents`, `POST /admin/document-versions/:id/verify`, and `POST /admin/document-versions/:id/publish`. All use actor middleware and typed error responses.

- [ ] **Step 5: Run tests and migration check**

Run: `npm test -w api && npm test -w @board-game-rules-assistant/database && npm run db:check -w @board-game-rules-assistant/database`

Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api apps/packages/database
git commit -m "feat: add admin global library publishing"
```

---

### Task 7: Durable conversations, citations, and guest cleanup

**Files:**
- Create: `apps/api/src/application/conversations/conversation-service.ts`
- Create: `apps/api/src/presentation/http/conversations/conversation-schema.ts`
- Create: `apps/api/src/presentation/http/conversations/conversation-router.ts`
- Create: `apps/api/tests/conversation-service.test.ts`
- Create: `apps/api/tests/conversation-router.test.ts`
- Create: `apps/packages/database/src/cleanup-expired-guests.ts`
- Create: `apps/packages/database/tests/cleanup-expired-guests.test.ts`
- Modify: `apps/api/src/main.ts`
- Modify: `apps/api/openapi.yml`

**Interfaces:**
- Consumes: actor-scoped conversation repository.
- Produces: create/list/get conversation operations and `cleanupExpiredGuestSessions(now)`.

- [ ] **Step 1: Write failing conversation tests**

Cover registered permanence, guest `expiresAt = createdAt + 7 days`, cross-owner 404 behavior, one selected `gameId`, ordered messages, and cascade deletion after expiry.

- [ ] **Step 2: Run and verify failure**

Run: `npm test -w api -- conversation-service.test.ts`

Expected: FAIL because the service is missing.

- [ ] **Step 3: Implement conversation service and routes**

Add `POST /conversations`, `GET /conversations`, `GET /conversations/:id`, and `DELETE /conversations/:id`. Registered actors use `user_id`; guests use `guest_session_id` and inherit its exact expiry.

- [ ] **Step 4: Implement cleanup as an idempotent command**

Export:

```ts
export const cleanupExpiredGuestSessions = async (
  persistence: Persistence,
  now: Date,
): Promise<{ deletedSessions: number }> => { /* delete expired sessions; rely on FK cascades */ };
```

Wire it as an npm script suitable for cron rather than a timer inside every API process.

- [ ] **Step 5: Run tests**

Run: `npm test -w api && npm test -w @board-game-rules-assistant/database`

Expected: all PASS in memory and PostgreSQL modes.

- [ ] **Step 6: Commit**

```bash
git add apps/api apps/packages/database
git commit -m "feat: persist conversations and guest expiry"
```

---

### Task 8: Authorized tier-based retrieval and atomic citations

**Files:**
- Modify: `apps/api/src/application/retrieval/retrieval-service.ts`
- Modify: `apps/api/src/application/retrieval/retrieval-types.ts`
- Modify: `apps/api/src/presentation/http/retrieval/retrieval-schema.ts`
- Modify: `apps/api/src/presentation/http/retrieval/retrieval-router.ts`
- Modify: `apps/api/tests/retrieval-service.test.ts`
- Modify: `apps/api/tests/retrieval-schema.test.ts`
- Modify: `apps/api/src/main.ts`
- Modify: `apps/api/openapi.yml`

**Interfaces:**
- Consumes: `AccessPolicyService`, actor-scoped conversations, scoped `VectorStore`, and citation persistence.
- Produces: grounded conversation turns with durable citations and no client-controlled `topK`.

- [ ] **Step 1: Write failing retrieval-policy tests**

Add table-driven assertions for Guest 3, Standard 5, Pro 8, and Admin 10. Assert the vector call receives `{ gameId, userId? }`, that a client `topK` field is rejected, and that another user's chunks never appear.

- [ ] **Step 2: Write failing atomicity tests**

Assert user messages survive model failure, no assistant message is created on failure, and successful completion writes one assistant message and all ranked citations in one repository call.

- [ ] **Step 3: Run and verify failure**

Run: `npm test -w api -- retrieval-service.test.ts`

Expected: FAIL because retrieval still uses `DEFAULT_TOP_K` and the old conversation repository.

- [ ] **Step 4: Implement actor-scoped retrieval**

Change `search` input to `{ actor, conversationId, query }`. Load the owned conversation and policy, persist the user message, search the selected game's authorized sources with server `topK`, generate or abstain, then call `appendAssistantMessageWithCitations` once.

Map each rulebook match to a citation with exact `documentChunkId`, one-based rank, similarity/distance, and a bounded `quotedText` snapshot.

- [ ] **Step 5: Remove obsolete repositories**

Delete:

```text
apps/api/src/domain/conversation/conversation-repository.ts
apps/api/src/domain/rulebook/rulebook-repository.ts
apps/api/src/infrastructure/persistence/conversation/in-memory-conversation-repository.ts
apps/api/src/infrastructure/persistence/rulebook/in-memory-rulebook-repository.ts
```

Update or replace their old tests with database contract coverage.

- [ ] **Step 6: Run all tests and typechecks**

Run:

```bash
npm test --workspaces --if-present
npm run typecheck
npm run build
```

Expected: all PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/api apps/packages/database apps/packages/rag-core
git commit -m "feat: authorize retrieval and persist citations"
```

---

### Task 9: End-to-end persistence smoke test and documentation

**Files:**
- Create: `scripts/persistence-smoke.sh`
- Create: `apps/api/tests/persistence-smoke.test.ts`
- Modify: `README.md`
- Modify: `apps/api/README.md`
- Modify: `apps/packages/database/README.md`
- Modify: `apps/api/.env.example`
- Modify: `package.json`

**Interfaces:**
- Consumes: completed API, migrations, PostgreSQL driver, and Docker Compose service.
- Produces: repeatable local verification and operating documentation.

- [ ] **Step 1: Write the smoke test**

The test must:

1. Apply migrations to a clean test database.
2. Seed an admin, Standard user, Pro user, and game.
3. Publish one global rulebook version with deterministic embeddings.
4. Add three Standard private documents and reject the fourth.
5. Create a Standard conversation and assert vector search receives `topK=5`.
6. Save an answer and citations.
7. Close and recreate PostgreSQL persistence.
8. Assert the conversation and citations still exist.
9. Create an expired guest session, run cleanup, and assert its conversation is gone.

- [ ] **Step 2: Run the smoke test and verify any missing wiring fails**

Run: `docker compose up -d postgres && npm test -w api -- persistence-smoke.test.ts`

Expected before fixes: FAIL at the first incomplete wiring boundary; use the failure to make only the smallest wiring correction.

- [ ] **Step 3: Add the shell entry point and root script**

`scripts/persistence-smoke.sh` must use `set -euo pipefail`, start the PostgreSQL service, run migrations, execute the smoke test, and leave the database running for inspection. Add root script:

```json
"test:persistence": "bash scripts/persistence-smoke.sh"
```

- [ ] **Step 4: Document both local modes**

Document exact commands:

```bash
# Normal durable local mode
docker compose up -d postgres
npm run db:migrate -w @board-game-rules-assistant/database
npm run dev:api

# Lightweight reset-on-restart mode
PERSISTENCE_DRIVER=memory npm run dev:api
```

Document production migration-before-start, managed pgvector requirements, the three-document Standard limit, role/tier separation, guest expiry cleanup, and the fact that PDFs are still deleted after ingestion.

- [ ] **Step 5: Run final verification**

Run:

```bash
npm run test:persistence
npm test --workspaces --if-present
npm run typecheck
npm run build
git diff --check
```

Expected: all tests, typechecks, builds, and whitespace checks PASS.

- [ ] **Step 6: Commit**

```bash
git add scripts/persistence-smoke.sh apps/api/tests/persistence-smoke.test.ts README.md apps/api/README.md apps/packages/database/README.md apps/api/.env.example package.json
git commit -m "test: verify durable persistence workflow"
```

---

## Final Acceptance Checklist

- [ ] `PERSISTENCE_DRIVER=memory` runs the whole API without PostgreSQL and resets on restart.
- [ ] `PERSISTENCE_DRIVER=postgres` survives API restart.
- [ ] Production rejects memory mode.
- [ ] Drizzle migrations create and seed the complete schema and `vector` extension.
- [ ] Memory and PostgreSQL adapters pass one contract suite.
- [ ] Standard cannot own more than three active private PDF documents; Pro has no document limit; Guest cannot upload.
- [ ] Admin authority is independent of plan tier and is required for global publish.
- [ ] Failed re-indexing never displaces the active version.
- [ ] Guests retrieve global sources with `topK=3` and expire after seven days.
- [ ] Standard retrieves global plus owned private sources with `topK=5`.
- [ ] Pro retrieves global plus owned private sources with `topK=8`.
- [ ] Admin retrieval uses `topK=10`.
- [ ] Cross-user private documents and conversations return 404 and never enter the vector candidate set.
- [ ] Assistant messages and citations commit atomically.
- [ ] Exact cosine retrieval is used; no HNSW index exists yet.
- [ ] Uploaded PDF bytes are removed after ingestion and are not stored in PostgreSQL.
