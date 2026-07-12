# LangChain PostgreSQL Persistence: Small First Slice

**Status:** Approved design  
**Date:** 2026-07-12

## Purpose

Add durable PostgreSQL persistence to the API for its existing conversation repository and vector store. Keep this increment intentionally small: use LangChain's PostgreSQL vector-store integration, retain memory adapters for fast tests, and defer the broader identity, authorization, library, and document-lifecycle model.

## Scope

This increment provides:

- A workspace package at `apps/packages/database` named `@board-game-rules-assistant/database`.
- A shared PostgreSQL connection pool.
- A PostgreSQL implementation of the existing conversation repository.
- A `rag-core` `VectorStore` adapter backed by LangChain `PGVectorStore` and pgvector.
- Versioned SQL migrations for the extension and application-owned conversation schema.
- API composition selected by `PERSISTENCE_DRIVER`.
- A local pgvector-enabled PostgreSQL service in Docker Compose.
- Memory adapters for unit tests and lightweight local use.

This increment does not provide users, authentication, games, access policies, citations, document versions, publication workflows, vector indexes, metadata-filter expressions, or chunk deduplication.

## Chosen Approach

Use LangChain's `PGVectorStore` from `@langchain/community` with the `pg` driver. This keeps vector persistence aligned with the abstraction already used by `rag-core` and minimizes custom similarity-search code.

The database package owns one `pg.Pool`, the conversation schema, migration execution, health checks, adapter construction, and connection shutdown. LangChain initializes and owns the shape of its vector table. A later increment may migrate that table to an application-owned schema when relational authorization or document lifecycle joins become necessary.

Drizzle is not introduced in this slice. Conversation persistence uses parameterized SQL through the shared `pg` pool.

## Package API and Boundaries

The database package exports a PostgreSQL persistence factory that accepts the database URL, embeddings implementation, message-retention limit, and vector-table configuration. The returned bundle exposes:

- `conversationRepository`
- `vectorStore`
- `healthCheck()`
- `close()`

The API owns driver selection and application startup. `rag-core` continues to own the storage-independent `VectorStore` contract and rulebook document types. The existing conversation contract remains an API domain contract for this slice.

Because PostgreSQL is asynchronous, `ConversationRepository.appendMessages` and `ConversationRepository.getMessages` become promise-returning methods. `RetrievalService` awaits conversation reads and completed-turn writes. Both memory and PostgreSQL implementations satisfy the same asynchronous contract.

## PostgreSQL Schema

The application-owned migration creates the `vector` extension, a migration-history table, and `conversation_messages`:

| Column | Type | Rules |
| --- | --- | --- |
| `id` | `BIGSERIAL` | Primary key and deterministic message order |
| `conversation_id` | `TEXT` | Not null |
| `role` | `TEXT` | Not null; `user` or `assistant` |
| `content` | `TEXT` | Not null |
| `created_at` | `TIMESTAMPTZ` | Not null; defaults to `now()` |

An index on `(conversation_id, id)` supports ordered conversation reads and retention cleanup.

LangChain initializes a dedicated vector table with an identifier, page content, JSONB metadata, and pgvector embedding. The configured embeddings implementation determines vector dimensions. Similarity uses cosine distance.

## Conversation Behavior

Appending a message batch runs in one transaction. It inserts the batch and deletes older rows beyond the configured maximum, which defaults to 20 messages per conversation. This preserves the existing bounded-history behavior under concurrent database use.

Reads return messages for one conversation ordered from oldest to newest. An unknown conversation ID returns an empty array. Repository results are new objects and cannot mutate persisted state.

## Vector Behavior

The adapter preserves the current `rag-core` methods:

- `upsert(records)` delegates document addition to LangChain.
- `similaritySearch(input)` returns documents ordered by similarity.
- `similaritySearchVectorWithScore(input)` returns documents with cosine-similarity scores.

Despite the existing method name, `upsert` remains append-oriented in this slice, matching current memory behavior. Re-ingesting the same chunks can create duplicates. Stable chunk identifiers and replacement semantics are deferred.

The existing `VectorStore` filter is an arbitrary JavaScript callback and cannot be translated safely into SQL. PostgreSQL searches support no callback filter in this slice. Passing one throws a clear unsupported-operation error rather than retrieving a broad candidate set and filtering afterward. A future contract may introduce database-native metadata filter expressions.

## Configuration and Composition

The API adds:

- `PERSISTENCE_DRIVER=postgres|memory`
- `DATABASE_URL`, required when the PostgreSQL driver is selected
- An optional message-retention setting with a default of 20

Normal Docker Compose development selects PostgreSQL and supplies the service URL. Tests select memory unless they explicitly exercise PostgreSQL. Production refuses to start with the memory driver.

The local database service uses the official pgvector PostgreSQL image, a health check, a named data volume, and credentials intended only for local development.

## Startup, Health, and Shutdown

The API performs these steps before listening:

1. Validate configuration.
2. Create the shared connection pool.
3. Run pending versioned SQL migrations.
4. Initialize LangChain `PGVectorStore`.
5. Execute `SELECT 1` and verify that the `vector` extension exists.
6. Construct application services and start Express.

A migration, connection, extension, or vector-store initialization failure prevents startup. Runtime database errors propagate through the existing API error path. Graceful shutdown closes the HTTP server and PostgreSQL pool. Memory persistence has no-op health and close operations.

## Testing

A shared repository contract suite runs against the memory and PostgreSQL conversation implementations. It verifies isolation, ordering, retention, unknown-conversation behavior, and persistence-safe returned values.

Docker-backed integration tests verify:

- migrations and the `vector` extension;
- persistence across repository instances;
- vector insertion and scored cosine search using deterministic embeddings;
- explicit rejection of callback filters;
- health checks and pool shutdown.

API configuration tests cover driver selection, conditional `DATABASE_URL` requirements, and the production memory-driver guard. Existing API tests continue to use memory persistence. Final verification runs package tests, API tests, workspace type-checking, linting, formatting, and a Docker-backed smoke test.

## Deferred Decisions

The following require a later design increment:

- Application-owned vector schema and migrations.
- Stable chunk IDs, replacement, and deduplication.
- Metadata filter expressions.
- HNSW or IVFFlat indexes based on measured scale and recall.
- Games, users, visibility, authorization, citations, and document versions.
- Transactional coordination between conversation messages and generated answers.
