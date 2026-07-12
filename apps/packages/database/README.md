# Database package

This package provides interchangeable in-memory and PostgreSQL persistence. The
PostgreSQL adapter stores identities, tier policies, games, document/version
lifecycle, exact-cosine pgvector chunks, conversations, messages, and citations.

## Local operation

From the repository root:

```bash
docker compose up -d postgres
npm run db:migrate -w @board-game-rules-assistant/database
npm run dev:api
```

Use `PERSISTENCE_DRIVER=memory npm run dev:api` only for a lightweight local
process whose data may reset on restart. Development/production deployments
require PostgreSQL. Always migrate before starting a new API release. Managed
PostgreSQL must support pgvector and allow `CREATE EXTENSION vector`.

Standard tier permits three active private documents, Pro is unlimited, and
guests cannot upload. Admin is an account role independent of tier and is
required to verify and publish global rulebooks. Run `npm run cleanup:guests -w
@board-game-rules-assistant/database` on a schedule to remove seven-day guest
sessions and cascade their conversations. Uploaded PDF files are temporary and
deleted after ingestion; original PDF bytes are not stored in PostgreSQL.

Run `npm run test:persistence` at the repository root for the deterministic,
no-external-API durability smoke test. It leaves the PostgreSQL service running.
