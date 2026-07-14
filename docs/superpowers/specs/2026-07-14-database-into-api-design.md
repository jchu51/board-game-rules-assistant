# Move Database Package into API Design

## Goal

Move all code owned by `@board-game-rules-assistant/database` into `apps/api`
without changing database schemas, endpoint behavior, or persistence semantics.

## Scope

This phase moves only the database package. `rag-core` and `agent-core` remain
workspace packages. The API continues to use the existing `VectorStore`
contract from `rag-core`.

## Target Structure

```text
apps/api/
  migrations/
    0001_conversation_messages.sql
    0002_conversations.sql
    0003_rulebooks.sql
  src/infrastructure/database/
    migrations.ts
    persistence.ts
    vector/langchain-pg-vector-store.ts
  tests/database/
    langchain-pg-vector-store.test.ts
    migrations.test.ts
    persistence.test.ts
    test-database.ts
```

The API persistence factory imports `createPostgresPersistence` locally. Domain
repository implementations remain in their current API directories.

## Migration Loading and Build

Source execution reads SQL from `apps/api/migrations`. The bundled API reads the
same files from `apps/api/dist/migrations`. The API build copies the migration
directory beside `dist/main.js`, just as it already copies `openapi.yml`.

Migration versions, transaction handling, and the `app_migrations` table remain
unchanged.

## Dependencies

Move the database package's direct PostgreSQL vector dependency,
`@langchain/community`, into `apps/api/package.json`. The API already owns `pg`
and its TypeScript types. Remove the database workspace package and regenerate
the npm lockfile so it no longer contains the internal database package.

## Tests

Move database tests under `apps/api/tests/database` and update relative imports.
The tests continue using `TEST_DATABASE_URL` with the existing default local
PostgreSQL URL. API unit tests and database integration tests remain separately
addressable by file path even though they share the API Vitest project.

Verification covers:

- Ordered and idempotent migrations.
- PostgreSQL persistence health and close behavior.
- Pgvector similarity search behavior.
- API tests, typecheck, build, lint, and formatting.
- Compiled migration files under `apps/api/dist/migrations`.

## Documentation and Removal

Move relevant database-package operational documentation into the API README.
Delete `apps/packages/database` only after imports, tests, dependencies, and
build output have been migrated successfully.

## Non-Goals

- Moving `rag-core` or `agent-core`.
- Changing tables or adding migrations.
- Changing API routes or response contracts.
- Changing persistence-driver configuration.
