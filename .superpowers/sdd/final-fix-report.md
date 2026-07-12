# Final fix report

## Status

All five final review findings are addressed.

## Security boundary

- `x-user-id` and `x-guest-session-id` are development adapters only. `ActorService` accepts them only when both conditions hold: `NODE_ENV` is `local` or `test`, and `allowDevelopmentHeaders` is explicitly enabled.
- Development and production reject every protected request with HTTP 401 `{ code: "AUTHENTICATION_REQUIRED" }`, even when a supplied UUID belongs to a real administrator. No verified authentication provider is integrated yet, so protected endpoints intentionally fail closed in those environments.
- Local fallback is likewise limited to explicit local/test development-adapter mode.

## Upload recovery and failure safety

- Failed first private uploads persist a failed version with stable code/text and then soft-delete the newly created document, immediately releasing the Standard quota. Cleanup runs in `finally` even if failure-state persistence itself errors.
- Failed replacement uploads mark only the candidate version failed; the existing document, active version, and single quota slot remain intact.
- Private and global ingestion share a stable failure payload: `INGESTION_FAILED` / `Rulebook processing failed`. Raw exception messages, file paths, provider bodies, and keys are never stored. The stored message is 26 characters.

## Concurrent versions

- PostgreSQL `createVersion` and `createGlobalDraftVersion` take the same per-document transaction advisory lock before reading `max(version_number)` and inserting. Concurrent replacements and global drafts therefore allocate unique monotonic numbers without transient unique violations.
- Memory operations contain no await between allocation and insertion, preserving equivalent single-process behavior.

## OpenAPI

- Rulebook upload/list/delete descriptions now document PostgreSQL durability by default, local/test memory mode, and soft-delete exclusion from retrieval.
- The API description records the fail-closed production authentication limitation.

## Evidence

- Focused compiled auth, middleware, private/global ingestion tests: **20 passed, 0 failed**.
- Full compiled API suite: **73 passed, 0 failed**.
- Full live database suite: **27 passed, 0 failed**, including concurrent private and global version allocation.
- Persistence smoke: **1 passed, 0 failed**; durable workflow survived restart and guest cleanup.
- Database schema check: `Everything's fine`.
- Database typecheck/build and API typecheck passed.
- API lint completed with two pre-existing `no-unsafe-finally` warnings in `persistence-smoke.test.ts`; no lint errors.
- `git diff --check` passed.

## Concerns

- Production/development protected functionality remains intentionally unavailable until a verified auth provider supplies authoritative actors. Re-enabling raw identity headers there would be a security regression.
- The version allocator uses PostgreSQL advisory transaction locks rather than row locks so both private and global paths share one deterministic per-document lock before allocation.
