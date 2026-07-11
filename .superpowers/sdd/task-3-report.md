# Task 3 report: PostgreSQL adapters and shared contract suite

## Status

Complete. PostgreSQL repositories, exact authorized pgvector retrieval, health checks, serializable vector scopes, and the shared memory/PostgreSQL lifecycle contract are implemented.

## TDD evidence

### RED

Command:

```bash
npm test -w @board-game-rules-assistant/database
```

Observed expected failure (exit 2):

```text
tests/postgres-contract.test.ts(1,10): error TS2724:
'"../src/index.js"' has no exported member named 'createPostgresPersistence'.
Did you mean 'createMemoryPersistence'?
```

### GREEN: live database suite

The repository's `tsx` runner encountered the documented optional-binary mismatch (`Host version "0.28.1" does not match binary version "0.18.20"`). Tests were therefore compiled without changing assertions, the `drizzle` directory was copied beside the compiled database package, and Node's test runner was used:

```bash
npm run build -w @board-game-rules-assistant/rag-core
rm -rf .superpowers/sdd/task-3-build/database
npx tsc -p apps/packages/database/tests/tsconfig.json --noEmit false --outDir .superpowers/sdd/task-3-build/database
cp -R apps/packages/database/drizzle .superpowers/sdd/task-3-build/database/drizzle
node --test .superpowers/sdd/task-3-build/database/tests/*.test.js
```

Observed live localhost PostgreSQL evidence (exit 0):

```text
memory persistence: 3 contract cases passed
memory vector tests: 3 passed
migration creates vector extension and complete constrained schema: passed
migration seeds every policy field and is idempotent: passed
postgres persistence: 3 contract cases passed
tests 11, pass 11, fail 0
```

The PostgreSQL lifecycle contract created isolated databases through `createPostgresTestDatabase`, ran real Drizzle migrations, executed health checks, inserted 3,072-dimensional pgvector embeddings, verified failed/private/global replacement behavior, exercised exact cosine retrieval with authorization and server-side limits, soft-deleted private data, and atomically persisted an assistant message with two real chunk citations.

### GREEN: rag-core fallback

```bash
rm -rf .superpowers/sdd/task-3-build/rag-core
npx tsc -p apps/packages/rag-core/tsconfig.test.json --noEmit false --outDir .superpowers/sdd/task-3-build/rag-core
node --test .superpowers/sdd/task-3-build/rag-core/tests/*.test.js
```

Observed (exit 0): `tests 5, pass 5, fail 0`.

### GREEN: full typecheck and whitespace validation

```bash
npm run typecheck
git diff --check
```

Observed: both exited 0; all workspace TypeScript projects passed.

## Implementation notes

- Private activation requires `userId` and includes owner authorization inside the transaction; a shared contract assertion rejects cross-owner activation.
- `countActivePrivateDocuments` uses a database `count()` filtered by owner, private visibility, and `deleted_at is null`.
- Private replacement, global publication, and assistant-message/citation writes use Drizzle transactions.
- PostgreSQL search joins chunks, versions, and documents; filters active/non-deleted/game/global-or-owner rows; orders by exact cosine distance; applies SQL `LIMIT`; and returns `1 - distance`.
- No HNSW or IVFFlat index was added.
- Health checks verify connectivity, the `vector` extension, Drizzle migration-table presence, and the production dimension invariant of 3,072, with typed errors.
- Admin remains an account role; no separate admin identity model was introduced.

## Concern

Task 8 should derive the authenticated `userId` and canonical `gameId` from the owned conversation, then remove `gameId` from the public request payload. In this pre-auth stage the public payload requires only `gameId`; it does not accept `userId`.

## Review fixes

### Additional RED evidence

API boundary tests were updated first to require `gameId`. The test TypeScript check failed as expected because `RetrievalSearchInput` did not yet expose it:

```text
apps/api/tests/retrieval-service.test.ts(...): error TS2353:
Object literal may only specify known properties, and 'gameId' does not exist in type 'RetrievalSearchInput'.
```

Migration-state tests were also added before the health implementation changed:

```text
health accepts the current migration state: passed
health rejects an empty migration journal: failed — Missing expected rejection
health rejects a stale migration journal: failed — Missing expected rejection
tests 3, pass 1, fail 2
```

### Review-fix GREEN evidence

Full compiled database suite against live localhost PostgreSQL:

```text
memory persistence contract: 3 passed
memory vector store: 3 passed
migration schema/idempotency: 2 passed
postgres persistence contract: 3 passed
health current/empty/stale migration states: 3 passed
tests 14, pass 14, fail 0
```

Compiled rag-core suite:

```text
tests 5, pass 5, fail 0
```

The authorization test explicitly scopes as Bob and proves Alice's private chunk is absent while the global chunk for the same game remains. The same shared assertion ran against memory and live PostgreSQL.

Relevant compiled API suites:

```text
Retrieval schemas: 2 passed
RetrievalService: 7 passed
tests 9, pass 9, fail 0
```

The service assertion verifies the explicit `gameId` reaches vector scope and no client-provided `userId` is present.

Final commands:

```bash
npm run typecheck
npm run build -w web
git diff --check
```

All exited 0. The public API and web client now require an explicit game identifier; `RetrievalService` no longer derives or fabricates it from `conversationId`. `CURRENT_MIGRATION_STATE` names the expected migration count and latest applied timestamp and must be advanced with future production migrations.
