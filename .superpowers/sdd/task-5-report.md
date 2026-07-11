# Task 5 report

## Status

Implemented actors, effective tier policies, admin retrieval override, typed HTTP errors, actor middleware, actor-scoped private uploads and concurrency-safe Standard quotas.

## Implementation

- Added `AccessPolicyService` with exact Guest/Standard/Pro persisted policies, admin `retrievalTopK = 10`, quota preflight, atomic document admission, and admin assertions.
- Added typed actor resolution errors and mounted the replaceable actor middleware before upload parsing/processing and retrieval handlers.
- Added typed HTTP mappings: plan limit 403 with usage/limit, expired guest 401, concealed resource access 404, and database outage 503.
- Added actor/game/title/kind/document inputs to PDF ingestion and exposed replacement uploads through the HTTP request schema.
- Existing owned document versions bypass slot admission; non-owned document IDs return concealed 404 errors.
- New Standard documents use a PostgreSQL transaction guarded by a per-owner advisory transaction lock, making count-and-insert safe under concurrent requests. Pro uses the same operation with no limit.
- Moved checksum work ahead of slot admission and rolls back a newly admitted document by soft deletion if its first processing version cannot be created. Processing versions transition to ready or failed through the repository.
- Retrieval now uses effective policy topK, including the admin role override without altering plan quota.

## TDD and verification

- RED observed: policy test compilation failed because `AccessPolicyService` did not exist.
- Normal workspace tests reach the known `tsx` esbuild host/binary mismatch (`0.28.1` vs `0.18.20`), so verification used compiled JavaScript output as directed.
- Compiled API suite: **54 passed, 0 failed**, including live PostgreSQL rulebook composition.
- Compiled database suite: **18 passed, 0 failed**, including migrations, health checks, memory contracts, and live PostgreSQL contracts.
- PostgreSQL concurrency contract launches eight simultaneous admissions with limit 3 and verifies exactly three active documents.
- API typecheck and lint pass; database typecheck/build pass; `git diff --check` passes.

## Self-review

Two-axis review found no documented standards violations. Review concerns were addressed by mounting the actor middleware, making ingestion actor metadata required, exposing replacement metadata in the HTTP schema, moving file work before quota admission, and cleaning up an admitted document if initial version creation fails. The explicit preflight quota method remains because it is required by the task brief; actual admission never relies on that race-prone preflight and uses the atomic repository operation.

## Concerns

- The compiled fallback requires adding `.js` suffixes only in generated verification output because the source project uses bundler-style extensionless imports.
- PostgreSQL quota serialization uses `pg_advisory_xact_lock(hashtextextended(ownerId, 0))`; this is PostgreSQL-specific by design, while memory remains local/test-only.

## Review fix: PostgreSQL repository error boundary

- Added one composition-level `withPostgresErrorBoundary` proxy around identity, policy, library, conversation, and vector-store adapters. Repository methods therefore share one translation policy rather than repetitive catches.
- The classifier walks wrapped causes and translates only connection/availability codes (connection lifecycle, network failures, PostgreSQL SQLSTATE class 08, and server-shutdown states) to `DatabaseUnavailableError` with the original error chain as `cause`.
- Existing `DatabaseUnavailableError` instances pass through unchanged. Repository domain errors and SQL constraint errors are not translated; live regressions cover `PersistenceNotFoundError` and unique violation SQLSTATE `23505`.
- Live end-to-end regression closes the public PostgreSQL persistence client, invokes `policies.getTierPolicy`, verifies `DatabaseUnavailableError`, and passes it through API error middleware to verify HTTP 503 `{ code: "DATABASE_UNAVAILABLE" }`.

### Review-fix evidence

- RED: focused live boundary suite failed 2/2 before implementation: the closed connection surfaced as `DrizzleQueryError` with nested `CONNECTION_ENDED`, and the unique constraint surfaced as `DrizzleQueryError` with nested SQLSTATE `23505`.
- GREEN: focused live boundary suite passed 2/2 after the centralized boundary.
- Full compiled database suite: **20 passed, 0 failed** against live PostgreSQL.
- Full compiled API suite: **55 passed, 0 failed**, including the live repository-to-HTTP 503 regression.
- `npm run build -w @board-game-rules-assistant/database` and `npm run typecheck -w api` passed before the full suites.
