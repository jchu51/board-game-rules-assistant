# LangChain PostgreSQL Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist API conversation history and rulebook vectors in a real PostgreSQL/pgvector database while retaining selectable in-memory adapters for tests.

**Architecture:** Add `@board-game-rules-assistant/database` with one `pg.Pool`, versioned application migrations, a parameterized-SQL conversation repository, and an adapter around LangChain `PGVectorStore`. The API selects memory or PostgreSQL composition at startup and waits for persistence health before listening.

**Tech Stack:** TypeScript 6, Node.js 22, Vitest 4, PostgreSQL 17, pgvector, `pg`, `@langchain/community`, Docker Compose, Zod.

## Global Constraints

- Only conversation messages and rulebook vectors are persisted in this slice.
- Keep memory persistence available for tests and lightweight local use.
- Production must reject `PERSISTENCE_DRIVER=memory`.
- PostgreSQL callback filters must fail explicitly; do not post-filter an over-broad result set.
- Vector insertion remains append-oriented; do not add deduplication or replacement behavior.
- Use exact cosine similarity; do not add HNSW or IVFFlat indexes.
- One shared `pg.Pool` owns all database connections and must close on shutdown.
- Preserve unrelated worktree changes and commit only files named by each task.

---

## Planned File Structure

```text
apps/packages/database/
  package.json                         # package dependencies and scripts
  tsconfig.json                        # build configuration
  vitest.config.ts                     # unit/integration test project
  migrations/
    0001_conversation_messages.sql     # extension, migration ledger, conversation schema
  src/
    index.ts                           # public exports
    persistence.ts                     # persistence bundle factory and lifecycle
    migrations.ts                      # ordered SQL migration runner
    conversation/
      conversation-types.ts            # structurally compatible conversation contract
      postgres-conversation-repository.ts
    vector/
      langchain-pg-vector-store.ts      # rag-core adapter
  tests/
    conversation-contract.ts           # reusable behavior suite
    postgres-conversation-repository.test.ts
    migrations.test.ts
    langchain-pg-vector-store.test.ts
    test-database.ts                   # Docker database test setup and deterministic embeddings

apps/api/src/
  config/config-schema.ts              # persistence environment validation
  config/config-types.ts               # typed persistence config
  config/config.ts                     # environment mapping
  domain/conversation/conversation-repository.ts
  infrastructure/persistence/conversation/in-memory-conversation-repository.ts
  infrastructure/persistence/create-persistence.ts
  application/retrieval/retrieval-service.ts
  main.ts
```

---

### Task 1: Make conversation persistence asynchronous

**Files:**
- Modify: `apps/api/src/domain/conversation/conversation-repository.ts`
- Modify: `apps/api/src/infrastructure/persistence/conversation/in-memory-conversation-repository.ts`
- Modify: `apps/api/src/application/retrieval/retrieval-service.ts`
- Modify: `apps/api/tests/conversation-repository.test.ts`
- Modify: `apps/api/tests/retrieval-service.test.ts`

**Interfaces:**
- Produces: `ConversationRepository.appendMessages(...): Promise<void>` and `getMessages(...): Promise<ConversationMessage[]>`.
- Consumes: no new interfaces.

- [ ] **Step 1: Convert repository tests to the future asynchronous contract**

Mark both conversation repository tests `async`, then use:

```ts
await repository.appendMessages("conversation-a", [
  { role: "user", content: "first" },
]);
expect(await repository.getMessages("conversation-a")).toEqual([
  { role: "user", content: "first" },
]);
```

Update retrieval-service assertions so searches are awaited before checking persisted messages:

```ts
expect(await conversationRepository.getMessages("conversation-1")).toEqual([
  { role: "user", content: query },
  { role: "assistant", content: result.answer },
]);
```

- [ ] **Step 2: Run the targeted tests and verify the contract mismatch**

Run: `npm test -w api -- tests/conversation-repository.test.ts tests/retrieval-service.test.ts`

Expected: FAIL or TypeScript diagnostics because the repository methods are still synchronous and `RetrievalService` does not await writes.

- [ ] **Step 3: Change the interface and memory adapter**

Use these exact signatures:

```ts
export interface ConversationRepository {
  appendMessages(
    conversationId: string,
    messages: ConversationMessage[],
  ): Promise<void>;
  getMessages(conversationId: string): Promise<ConversationMessage[]>;
}
```

Make the memory methods `async` without changing their cloning and retention logic.

- [ ] **Step 4: Await reads and completed-turn writes in RetrievalService**

Change the read to:

```ts
const conversationMessages = (
  await this.conversationRepository.getMessages(conversationId)
).slice(-MAX_CONTEXT_MESSAGES);
```

Make `completeTurn` asynchronous, await `appendMessages`, and await every `completeTurn` call from `search`.

- [ ] **Step 5: Run targeted tests and type-check**

Run: `npm test -w api -- tests/conversation-repository.test.ts tests/retrieval-service.test.ts && npm run typecheck -w api`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/domain/conversation/conversation-repository.ts apps/api/src/infrastructure/persistence/conversation/in-memory-conversation-repository.ts apps/api/src/application/retrieval/retrieval-service.ts apps/api/tests/conversation-repository.test.ts apps/api/tests/retrieval-service.test.ts
git commit -m "refactor: make conversation persistence async"
```

---

### Task 2: Create the database package and PostgreSQL conversation repository

**Files:**
- Create: `apps/packages/database/package.json`
- Create: `apps/packages/database/tsconfig.json`
- Create: `apps/packages/database/vitest.config.ts`
- Create: `apps/packages/database/migrations/0001_conversation_messages.sql`
- Create: `apps/packages/database/src/conversation/conversation-types.ts`
- Create: `apps/packages/database/src/conversation/postgres-conversation-repository.ts`
- Create: `apps/packages/database/src/migrations.ts`
- Create: `apps/packages/database/src/index.ts`
- Create: `apps/packages/database/tests/conversation-contract.ts`
- Create: `apps/packages/database/tests/test-database.ts`
- Create: `apps/packages/database/tests/migrations.test.ts`
- Create: `apps/packages/database/tests/postgres-conversation-repository.test.ts`
- Modify: `docker-compose.yml`
- Modify: `package-lock.json`

**Interfaces:**
- Consumes: a `pg.Pool` or `pg.PoolClient` and async conversation method shapes from Task 1.
- Produces: `runMigrations(pool)`, `PostgresConversationRepository`, `ConversationMessage`, and `ConversationRepositoryLike`.

- [ ] **Step 1: Scaffold the workspace manifest and TypeScript/Vitest configuration**

Create the package with name `@board-game-rules-assistant/database`, ESM output, `build`, `typecheck`, and `test` scripts. Add runtime dependencies `@board-game-rules-assistant/rag-core`, `@langchain/community`, and `pg`; add `@types/node`, `@types/pg`, `tsx`, `typescript`, and `vitest` as development dependencies. Match `rag-core` compiler options with `rootDir: "src"` and `outDir: "dist"`.

Run:

```bash
npm install -w @board-game-rules-assistant/database @board-game-rules-assistant/rag-core@^0.1.0 @langchain/community pg
npm install -D -w @board-game-rules-assistant/database @types/node@^24.13.2 @types/pg tsx typescript@^6.0.3 vitest@^4.1.10
```

- [ ] **Step 2: Add and start the pgvector test service**

Add `postgres` to `docker-compose.yml` using `pgvector/pgvector:pg17`, database/user/password `board_game_rules`, port `5432`, a `pg_isready` health check, and named volume `postgres_data`. Do not change the API service yet.

Run: `docker compose up -d postgres`

Expected: `docker compose ps postgres` reports `healthy`.

- [ ] **Step 3: Write failing migration and conversation contract tests**

The migration test must assert:

```ts
expect((await pool.query("select extname from pg_extension where extname = 'vector'")).rows).toEqual([
  { extname: "vector" },
]);
expect((await pool.query("select version from app_migrations order by version")).rows).toEqual([
  { version: "0001_conversation_messages" },
]);
```

The reusable contract must test isolation, oldest-to-newest ordering, an empty unknown conversation, copied results, and retention. Invoke it with:

```ts
runConversationRepositoryContract("postgres", async () => {
  const database = await createTestDatabase();
  await runMigrations(database.pool);
  return {
    repository: new PostgresConversationRepository(database.pool, {
      maxMessagesPerConversation: 3,
    }),
    dispose: database.dispose,
  };
});
```

- [ ] **Step 4: Run the database tests and verify they fail**

Run: `TEST_DATABASE_URL=postgresql://board_game_rules:board_game_rules@127.0.0.1:5432/board_game_rules npm test -w @board-game-rules-assistant/database`

Expected: FAIL because migrations and the PostgreSQL repository are not implemented.

- [ ] **Step 5: Add the first SQL migration**

Create this migration:

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS app_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conversation_messages (
  id BIGSERIAL PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS conversation_messages_conversation_id_id_idx
  ON conversation_messages (conversation_id, id);
```

- [ ] **Step 6: Implement an idempotent ordered migration runner**

Embed an ordered manifest containing `0001_conversation_messages.sql`. For each migration, acquire a pool client, start a transaction, check `app_migrations` when it exists, execute unapplied SQL, insert its version, commit, and always release the client. Roll back and rethrow on failure. Resolve migration files relative to `import.meta.url`, supporting both source execution and compiled `dist` by copying the `migrations` directory in the package build script.

- [ ] **Step 7: Implement transactional conversation retention**

Define:

```ts
export type ConversationMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ConversationRepositoryLike = {
  appendMessages(conversationId: string, messages: ConversationMessage[]): Promise<void>;
  getMessages(conversationId: string): Promise<ConversationMessage[]>;
};
```

`appendMessages` must insert all messages with parameterized queries, then retain the newest limit using one transaction and this deletion shape:

```sql
DELETE FROM conversation_messages
WHERE conversation_id = $1
  AND id NOT IN (
    SELECT id FROM conversation_messages
    WHERE conversation_id = $1
    ORDER BY id DESC
    LIMIT $2
  );
```

Validate `maxMessagesPerConversation` as a positive integer in the constructor. `getMessages` selects `role, content` by conversation ID ordered by `id ASC`.

- [ ] **Step 8: Run database tests and workspace type-checking**

Run: `TEST_DATABASE_URL=postgresql://board_game_rules:board_game_rules@127.0.0.1:5432/board_game_rules npm test -w @board-game-rules-assistant/database && npm run typecheck`

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add apps/packages/database docker-compose.yml package-lock.json
git commit -m "feat: add postgres conversation repository"
```

---

### Task 3: Add the LangChain pgvector adapter and persistence lifecycle

**Files:**
- Create: `apps/packages/database/src/vector/langchain-pg-vector-store.ts`
- Create: `apps/packages/database/src/persistence.ts`
- Create: `apps/packages/database/tests/langchain-pg-vector-store.test.ts`
- Create: `apps/packages/database/tests/persistence.test.ts`
- Modify: `apps/packages/database/src/index.ts`
- Modify: `apps/packages/database/tests/test-database.ts`

**Interfaces:**
- Consumes: `EmbeddingsInterface`, `PGVectorStore`, `VectorStore`, `Pool`, `runMigrations`, and `PostgresConversationRepository`.
- Produces: `LangchainPgVectorStoreAdapter` and `createPostgresPersistence(options): Promise<PostgresPersistence>`.

- [ ] **Step 1: Add deterministic embeddings and failing vector tests**

Create a three-dimensional deterministic embedding double:

```ts
class KeywordEmbeddings implements EmbeddingsInterface {
  private readonly terms = ["resource", "road", "infection"];
  async embedDocuments(values: string[]) { return values.map((value) => this.embed(value)); }
  async embedQuery(value: string) { return this.embed(value); }
  private embed(value: string) {
    const normalized = value.toLowerCase();
    const vector = this.terms.map((term) => normalized.includes(term) ? 1 : 0);
    return vector.some(Boolean) ? vector : [0.001, 0.001, 0.001];
  }
}
```

Test unfiltered `upsert`, `similaritySearch`, scored ordering, metadata round-tripping, and rejection of a callback filter:

```ts
await expect(adapter.similaritySearch({
  query: "resources",
  filter: () => true,
})).rejects.toThrow("PostgreSQL vector search does not support callback filters");
```

- [ ] **Step 2: Run vector tests and verify they fail**

Run: `npm test -w @board-game-rules-assistant/database -- tests/langchain-pg-vector-store.test.ts`

Expected: FAIL because the adapter and persistence factory do not exist.

- [ ] **Step 3: Implement the adapter**

Wrap an initialized `PGVectorStore`. Before delegating either search method, reject `input.filter`. Delegate `upsert` to `addDocuments(records)`, `similaritySearch` to `similaritySearch(input.query, input.topK, undefined, input.callbacks)`, and scored search to `similaritySearchWithScore(input.query, input.topK, undefined, input.callbacks)`. Preserve `RulebookDocumentInterface` metadata.

- [ ] **Step 4: Implement one-pool persistence creation**

Expose:

```ts
export type CreatePostgresPersistenceOptions = {
  databaseUrl: string;
  embeddings: EmbeddingsInterface;
  maxMessagesPerConversation?: number;
  vectorTableName?: string;
};

export type PostgresPersistence = {
  conversationRepository: ConversationRepositoryLike;
  vectorStore: VectorStore;
  healthCheck(): Promise<void>;
  close(): Promise<void>;
};
```

The factory creates one `Pool`, runs migrations, calls `PGVectorStore.initialize` with cosine distance, the shared pool, table name `rulebook_vectors` by default, and explicit `id`, `embedding`, `content`, and `metadata` column names. On initialization failure, close the pool before rethrowing. `healthCheck` runs `SELECT 1` and verifies `vector` in `pg_extension`. `close` calls `pool.end()` exactly once.

- [ ] **Step 5: Run adapter and lifecycle tests**

Run: `npm test -w @board-game-rules-assistant/database && npm run typecheck -w @board-game-rules-assistant/database`

Expected: PASS, including real cosine search through pgvector.

- [ ] **Step 6: Commit**

```bash
git add apps/packages/database/src apps/packages/database/tests
git commit -m "feat: add langchain pgvector persistence"
```

---

### Task 4: Add API driver configuration and composition

**Files:**
- Modify: `apps/api/package.json`
- Modify: `apps/api/src/config/config-schema.ts`
- Modify: `apps/api/src/config/config-types.ts`
- Modify: `apps/api/src/config/config.ts`
- Create: `apps/api/src/infrastructure/persistence/create-persistence.ts`
- Modify: `apps/api/src/main.ts`
- Modify: `apps/api/tests/config-schema.test.ts`
- Modify: `apps/api/tests/config.test.ts`
- Create: `apps/api/tests/create-persistence.test.ts`
- Modify: `apps/api/.env.example`
- Modify: `package-lock.json`

**Interfaces:**
- Consumes: `createPostgresPersistence`, memory repositories, `LangchainMemoryVectorStore`, and API embeddings.
- Produces: `createPersistence({ config, embeddings })` returning a structurally common persistence bundle.

- [ ] **Step 1: Write failing configuration tests**

Assert these defaults and guards:

```ts
expect(EnvSchema.parse({
  OPENAI_API_KEY: "test-key",
  TAVILY_API_KEY: "test-tavily-key",
}).PERSISTENCE_DRIVER).toBe("memory");

expect(EnvSchema.safeParse({
  OPENAI_API_KEY: "test-key",
  TAVILY_API_KEY: "test-tavily-key",
  PERSISTENCE_DRIVER: "postgres",
}).success).toBe(false);

expect(EnvSchema.safeParse({
  NODE_ENV: "production",
  OPENAI_API_KEY: "test-key",
  TAVILY_API_KEY: "test-tavily-key",
  PERSISTENCE_DRIVER: "memory",
}).success).toBe(false);
```

Also test `DATABASE_URL`, `PERSISTENCE_MAX_MESSAGES`, and driver mapping in `config`.

- [ ] **Step 2: Run configuration tests and verify they fail**

Run: `npm test -w api -- tests/config-schema.test.ts tests/config.test.ts tests/create-persistence.test.ts`

Expected: FAIL because persistence configuration and composition do not exist.

- [ ] **Step 3: Add conditional Zod configuration**

Add `PERSISTENCE_DRIVER` with default `memory`, optional `DATABASE_URL`, and positive integer `PERSISTENCE_MAX_MESSAGES` defaulting to 20. Use `superRefine` to require the URL for PostgreSQL and reject memory in production. Map them to:

```ts
persistence: {
  driver: "memory" | "postgres";
  databaseUrl?: string;
  maxMessagesPerConversation: number;
}
```

- [ ] **Step 4: Implement the composition factory**

For memory, return `LangchainMemoryVectorStore`, `InMemoryConversationRepository`, resolved `healthCheck`, and resolved `close`. For PostgreSQL, narrow the already-validated URL and delegate to `createPostgresPersistence`. Keep embeddings shared with ingestion and vector search.

- [ ] **Step 5: Wire API startup and graceful shutdown**

Replace direct memory construction in `main.ts` with:

```ts
const persistence = await createPersistence({ config, embeddings });
await persistence.healthCheck();
const vectorStore = persistence.vectorStore;
const conversationRepository = persistence.conversationRepository;
```

Make shutdown idempotent, stop accepting HTTP traffic, await `persistence.close()`, then exit with success. Log and exit nonzero if closing fails.

- [ ] **Step 6: Document environment variables**

Add to `.env.example`:

```dotenv
PERSISTENCE_DRIVER=memory
DATABASE_URL=
PERSISTENCE_MAX_MESSAGES=20
```

- [ ] **Step 7: Run API and workspace verification**

Run: `npm test -w api && npm run typecheck && npm run build`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/api/package.json apps/api/src apps/api/tests apps/api/.env.example package-lock.json
git commit -m "feat: use selectable postgres persistence in api"
```

---

### Task 5: Add local pgvector service and end-to-end verification

**Files:**
- Modify: `docker-compose.yml`
- Modify: `README.md`
- Modify: `apps/api/README.md`
- Create: `apps/packages/database/README.md`

**Interfaces:**
- Consumes: the database factory and API configuration from Tasks 3 and 4.
- Produces: reproducible local PostgreSQL startup and documented verification commands.

- [ ] **Step 1: Connect the API service to pgvector in Docker Compose**

Use the PostgreSQL service added in Task 2. Configure the API service with:

```yaml
PERSISTENCE_DRIVER: postgres
DATABASE_URL: postgresql://board_game_rules:board_game_rules@postgres:5432/board_game_rules
PERSISTENCE_MAX_MESSAGES: 20
```

Make the API depend on the healthy PostgreSQL service.

- [ ] **Step 2: Start PostgreSQL and run migrations through integration tests**

Run: `docker compose up -d postgres`

Expected: `docker compose ps postgres` reports `healthy`.

Run: `TEST_DATABASE_URL=postgresql://board_game_rules:board_game_rules@127.0.0.1:5432/board_game_rules npm test -w @board-game-rules-assistant/database`

Expected: PASS against the real pgvector service.

- [ ] **Step 3: Document local and memory workflows**

Document `docker compose up`, the PostgreSQL connection settings, `PERSISTENCE_DRIVER=memory` for lightweight runs, persisted Docker volume behavior, how to run database integration tests, and the fact that vector callback filters and deduplication are not supported in this slice.

- [ ] **Step 4: Run formatting**

Use the repository's auto-format skill, then run the discovered formatter command.

Expected: formatter exits 0 and `git diff --check` prints no errors.

- [ ] **Step 5: Run final verification**

Run:

```bash
npm test
npm run typecheck
npm run build
npm run lint -w api
TEST_DATABASE_URL=postgresql://board_game_rules:board_game_rules@127.0.0.1:5432/board_game_rules npm test -w @board-game-rules-assistant/database
docker compose config --quiet
```

Expected: every command exits 0.

- [ ] **Step 6: Commit**

```bash
git add docker-compose.yml README.md apps/api/README.md apps/packages/database/README.md
git commit -m "docs: add local pgvector workflow"
```
