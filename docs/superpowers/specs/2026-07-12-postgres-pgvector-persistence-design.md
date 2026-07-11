# PostgreSQL and pgvector Persistence Design

**Status:** Approved design  
**Date:** 2026-07-12

## Purpose

Replace process-only persistence with a local-first, production-portable PostgreSQL design that stores relational application data and vector embeddings in one database. Preserve a complete in-memory mode for fast local experimentation and unit tests.

This phase persists users, access policies, games, rulebook metadata, extracted chunks, embeddings, conversations, messages, and citations. Original PDF bytes remain temporary and are deleted after ingestion. A future phase may store original PDFs in S3-compatible object storage and record the object key on the document version.

## Goals

- Run PostgreSQL with `pgvector` through Docker Compose for normal local development.
- Deploy later to any managed PostgreSQL provider that supports `pgvector` without using provider-specific application APIs.
- Store relational records and embeddings transactionally in one database.
- Support an admin-curated global rulebook library available to all users.
- Support private user uploads with plan-based limits.
- Persist registered-user conversations and citations.
- Persist guest conversations for seven days, then remove them.
- Keep a full in-memory persistence driver with the same application-facing contracts.
- Preserve immutable ingestion history and safe rollback when re-indexing fails.

## Non-Goals

- Storing original PDFs in PostgreSQL.
- Adding S3 or another object store in this phase.
- Introducing a dedicated vector database.
- Deploying a separate database microservice.
- Coupling the application to Supabase, Neon, or another provider SDK.
- Reproducing PostgreSQL concurrency or vector-index performance in memory mode.
- Implementing billing or payment processing. The database stores the effective plan tier; billing integration is a later concern.

## Chosen Approach

Create a workspace package named `@board-game-rules-assistant/database`. It owns:

- Drizzle schema and versioned migrations.
- PostgreSQL connection-pool lifecycle.
- Persistence contracts and both PostgreSQL and in-memory adapters.
- Repositories for identity, library, ingestion, conversations, and tier policies.
- A PostgreSQL `pgvector` adapter implementing the existing `rag-core` vector-store contract.

The database package is linked into the Express API process. It is not independently deployed. The API selects a persistence composition at startup and coordinates application workflows. `rag-core` remains storage-agnostic and continues to own PDF loading, chunking, embedding interfaces, and the vector-store contract.

Normal local development uses Docker Compose and `PERSISTENCE_DRIVER=postgres`. Lightweight local demos and tests may use `PERSISTENCE_DRIVER=memory`. Production refuses to start unless the driver is `postgres`.

Drizzle supports `pgvector` column types, HNSW indexes, and distance helpers. `pgvector` supports exact nearest-neighbor queries as well as HNSW and IVFFlat approximate indexes. The initial implementation uses exact cosine-distance search and adds approximate indexing only after representative scale and recall measurements justify it.

References:

- [Drizzle PostgreSQL extensions](https://orm.drizzle.team/docs/extensions)
- [pgvector documentation](https://github.com/pgvector/pgvector)

## Module Boundaries

### Express API

- Resolves authenticated users or anonymous guest sessions.
- Enforces endpoint authorization.
- Coordinates ingestion, publication, conversation, and answer-generation services.
- Converts domain errors into typed HTTP responses.
- Owns request and response schemas.

### Database Package

- Defines relational schema, constraints, indexes, and migrations.
- Exposes focused repository interfaces rather than a general database client to application services.
- Provides PostgreSQL and in-memory implementations of those interfaces.
- Provides the PostgreSQL vector-store adapter.
- Manages the PostgreSQL connection pool and health checks.

### RAG Core

- Loads PDF content.
- Splits content into chunks.
- Defines embedding and vector-store interfaces.
- Does not know about users, plans, global/private visibility, or conversations.

### Application Services

Business rules live in API application services rather than persistence adapters. These rules include upload quotas, source authorization, document-version transitions, global publication, guest expiry, and tier-based retrieval limits. This keeps behavior consistent across PostgreSQL and memory modes.

## Data Model

All primary keys are UUIDs. Mutable records include `created_at` and `updated_at`. Foreign keys and check constraints enforce structural invariants.

### `users`

- `id`
- `email`, unique
- `display_name`
- `account_role`: `user | admin`
- `plan_tier`: `standard | pro`
- timestamps

Administrative authority and subscription tier are independent. Changing a plan can never grant administrative access.

### `guest_sessions`

- `id`
- `created_at`
- `expires_at`

Guest sessions expire seven days after creation. They do not have upload privileges.

### `tier_policies`

- `tier`: `guest | standard | pro`
- `retrieval_top_k`
- `private_upload_limit`, nullable for unlimited
- `conversation_ttl_days`, nullable for permanent
- timestamps

Initial policy values are:

| Tier | Server `topK` | Private PDF limit | Conversation retention |
| --- | ---: | ---: | --- |
| Guest | 3 | 0 | 7 days |
| Standard | 5 | 3 total active private PDFs | Permanent |
| Pro | 8 | Unlimited | Permanent |

Admin retrieval uses a role override of `topK = 10`. The values are seeded data and can later be changed without recompiling the API. Clients do not submit or override `topK`.

### `games`

- `id`
- `name`
- `slug`, unique
- timestamps

`games` is the canonical catalog used to group all rule sources for one board game.

### `documents`

- `id`
- `game_id`
- `owner_id`, nullable
- `visibility`: `global | private`
- `kind`: initially `base_rules | expansion | errata | other`
- `title`
- `deleted_at`, nullable
- timestamps

Global documents have no owner and are managed by admins. Private documents require an owner. A database check constraint enforces the relationship between `visibility` and `owner_id`.

The Standard quota counts non-deleted private documents owned by the user, regardless of how many versions each document has. A replacement version of an existing private document does not consume another quota slot.
Soft-deleting a private document removes it from retrieval and releases its quota slot immediately.

### `document_versions`

- `id`
- `document_id`
- monotonically increasing `version_number` within the document
- `status`: `draft | processing | ready | published | failed | archived`
- `checksum`
- `embedding_provider`
- `embedding_model`
- `embedding_dimensions`
- `chunk_count`
- `failure_code`, nullable
- `failure_message`, nullable and sanitized
- `activated_at`, nullable
- `published_at`, nullable
- future nullable `object_storage_key`
- timestamps

Versions are immutable after becoming `ready`, `published`, `failed`, or `archived`, except for allowed lifecycle timestamps and status transitions. Only one version of a document can be active for retrieval. A failed version never displaces the current active version.

Private versions activate automatically after successful ingestion. Global versions become `ready`, then require an admin verification and publish action. Publishing atomically archives the previously published version and activates the new version.

### `document_chunks`

- `id`
- `document_version_id`
- `ordinal`
- `content`
- `page_number`, nullable
- `metadata` as JSONB
- `embedding` as `vector(n)`
- timestamps

`(document_version_id, ordinal)` is unique. The vector dimension is fixed by the configured embedding model for the initial deployment. Startup validates that configuration against the migrated schema and stored active versions.

B-tree indexes support filtering by version, document, game, visibility, owner, and active status. Retrieval initially performs an exact cosine-distance query after applying authorized-source filters. An HNSW cosine index is a later, evidence-driven migration.

The initial schema uses one fixed embedding dimension. Switching to a model with a different dimension requires an explicit schema migration and full re-index plan; incompatible dimensions are never mixed silently in the active retrieval set. Immutable versions preserve ingestion history, but a dimension-changing upgrade is a planned database migration rather than a runtime configuration toggle.

### `conversations`

- `id`
- `game_id`
- `user_id`, nullable
- `guest_session_id`, nullable
- `title`
- `expires_at`, nullable
- timestamps

Exactly one of `user_id` and `guest_session_id` must be present. A conversation selects one game, not one exact document. Registered conversations are permanent until deleted by the user. Guest conversations inherit the guest session expiry.

### `messages`

- `id`
- `conversation_id`
- `role`: `user | assistant | system`
- `content`
- `model`, nullable
- timestamps

### `message_citations`

- `message_id`
- `document_chunk_id`
- `rank`
- `distance`, nullable
- `quoted_text`
- timestamps

The composite key is `(message_id, document_chunk_id)`. Citations reference the exact retrieved chunk and keep a small text snapshot so historical conversations remain intelligible if a source is later archived or deleted.

## Retrieval Authorization and Ranking

Every conversation targets one selected game.

- Guests search active, published global chunks for that game.
- Registered users search those global chunks plus active private chunks for the same game where `owner_id` matches the user.
- Users never search another user's private chunks.
- Admins follow the same source-visibility rule unless an explicit administrative library endpoint is used.
- The API calculates `topK` from `account_role` and `tier_policies`; request payloads cannot increase it.

The authorization predicate is part of the vector query itself. The application must not retrieve an unauthorized candidate set and filter it afterward.

## Ingestion and Publication Flow

1. Resolve the actor and load the effective tier policy.
2. For private uploads, transactionally lock the user's quota scope and count non-deleted private documents.
3. If a Standard user is creating a fourth private document, return `PLAN_LIMIT_REACHED`.
4. Create the document and/or a new immutable version with status `processing`.
5. Extract, chunk, and embed outside a long-running database transaction.
6. In one transaction, insert all chunks and mark the version `ready`.
7. For private documents, activate the ready version in that transaction.
8. For global documents, leave it ready for admin verification.
9. On admin publish, atomically archive the old published version and publish the new version.

If extraction or embedding fails, mark the version `failed`, record a sanitized failure reason, and remove partial chunks. The existing active version remains searchable.

Database transactions or advisory locks prevent concurrent Standard uploads from both passing the three-document limit.

## Ask and Citation Flow

1. Resolve a registered user or unexpired guest session.
2. Verify conversation ownership and selected game.
3. Load the effective server-side `topK` policy.
4. Save the user message.
5. Embed the question.
6. Run an authorized exact cosine search across active sources for the selected game.
7. Generate an answer using retrieved context or abstain when evidence is insufficient.
8. Atomically save the assistant message and all message citations.

If answer generation fails after saving the user message, keep the user message and return a retryable error. Do not create a partial assistant message. A later retry creates one complete assistant message with its citations.

## Persistence Drivers

### PostgreSQL Driver

- Selected with `PERSISTENCE_DRIVER=postgres`.
- Uses `DATABASE_URL` and a single application connection pool.
- Required in production.
- Provides durable storage, database constraints, transactions, locking, and exact vector search.

### Memory Driver

- Selected with `PERSISTENCE_DRIVER=memory` in local or test environments.
- Covers users, guest sessions, policies, games, documents, versions, chunks, vectors, conversations, messages, and citations.
- Resets when the API process restarts.
- Implements the same observable repository and vector-store contracts.
- Emulates application outcomes but does not claim PostgreSQL-equivalent concurrency, locking, query-planner, or index behavior.

A shared repository contract suite runs against both drivers. PostgreSQL-only integration tests cover capabilities that memory mode cannot reproduce.

## Configuration and Deployment

Required configuration includes:

- `PERSISTENCE_DRIVER=postgres | memory`
- `DATABASE_URL` when the driver is PostgreSQL
- existing embedding-provider and embedding-model configuration

Docker Compose runs a PostgreSQL image with the `vector` extension for local development. Production uses a managed, provider-neutral PostgreSQL service with `pgvector`; the API is deployed separately and connects through `DATABASE_URL`.

Migrations are generated and versioned with Drizzle and run as an explicit deployment step. API instances do not race to apply migrations at startup.

On PostgreSQL startup, the API verifies:

- Database connectivity.
- Expected schema migration state.
- Availability of the `vector` extension.
- Compatibility between configured embedding dimensions and the chunk schema/active versions.

## Error Handling and Security

- Database outage: `503 DATABASE_UNAVAILABLE`.
- Embedding or generation outage: typed retryable upstream-service error.
- Standard upload quota exceeded: `403 PLAN_LIMIT_REACHED`, including current usage and limit.
- Expired guest session: `401 GUEST_SESSION_EXPIRED`.
- Unauthorized or cross-owner resource access: `404` to avoid disclosing resource existence.
- Embedding dimension mismatch: fail startup or ingestion before inserting chunks.
- Global publish without `account_role=admin`: `403 ADMIN_REQUIRED`.

Global publication always performs server-side role authorization. Plan changes never affect administrative authority.

Private document deletion sets `deleted_at` and removes it from retrieval immediately. A later cleanup job hard-deletes its versions and chunks. Global versions are archived rather than destructively deleted. Guest cleanup removes expired sessions and cascades to their conversations, messages, and citations.

`DATABASE_URL`, embedding credentials, and future S3 credentials remain runtime secrets and are never stored in application tables.

Application services enforce ownership through repository methods that require actor scope. Database constraints provide structural safety. PostgreSQL row-level security is deferred until there is a concrete need for direct database access by multiple application roles; the API initially connects through one restricted service role.

## Testing Strategy

- Shared contract tests run against PostgreSQL and memory repository adapters.
- Repository tests cover ownership, visibility, soft deletion, policy lookup, and typed not-found behavior.
- PostgreSQL integration tests use a disposable real database with `pgvector`; vector queries are not mocked.
- Migration tests apply all migrations to an empty database and verify extension, tables, constraints, and indexes.
- Concurrency tests prove simultaneous Standard uploads cannot exceed three active private documents.
- Version tests prove failed ingestion preserves the active version and global publish swaps versions atomically.
- Retrieval tests prove guest/global and registered/global-plus-own-private visibility rules.
- Policy tests verify server-enforced `topK` values of 3, 5, 8, and the admin override of 10.
- Conversation tests verify ownership, seven-day guest expiry, and atomic assistant-message-plus-citation writes.
- API tests use fake embedding and chat providers for deterministic upstream failure and abstention behavior.
- Docker Compose smoke tests cover migrations, ingestion, retrieval, API restart persistence, and conversation recovery.

## Rollout

1. Define persistence contracts and bring current in-memory implementations behind them.
2. Add the database workspace package, PostgreSQL/pgvector Docker service, Drizzle configuration, initial migrations, and health checks.
3. Implement PostgreSQL repositories and vector adapter; run shared contract tests against both drivers.
4. Replace the current in-memory rulebook wiring with driver-based composition while retaining memory mode.
5. Add users, guest sessions, roles, tiers, seeded policies, and private-upload quotas.
6. Add immutable document versions and admin global-library draft/verify/publish endpoints.
7. Add conversations, messages, citations, and guest-expiry cleanup.
8. Enable authorized global-plus-private retrieval and tier-based `topK`.
9. Remove obsolete persistence paths after PostgreSQL integration and smoke tests pass.

Each slice keeps the API runnable. PostgreSQL becomes the normal local driver only after it satisfies the shared repository contracts and end-to-end smoke test.

## Future Extensions

- Store original PDFs in S3-compatible object storage and populate `document_versions.object_storage_key`.
- Integrate billing to update effective plan tiers.
- Add configurable rate, token, or conversation limits alongside `topK` and upload quotas.
- Add hybrid full-text/vector search and reranking.
- Add HNSW after benchmarking exact-search latency and recall with representative data.
- Add PostgreSQL row-level security if direct multi-role database access becomes necessary.
