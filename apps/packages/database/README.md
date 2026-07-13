# Database Package

PostgreSQL infrastructure for conversation history, rulebook vectors, and
original rulebook PDFs. The package owns one shared `pg.Pool`, runs ordered SQL
migrations, and adapts LangChain `PGVectorStore` to the `rag-core` vector-store
contract. Domain repository contracts and PostgreSQL repository adapters live
in the API package.

The `rulebooks` table stores upload metadata and complete PDF bytes in a `BYTEA`
column. Uploads are limited by the API to 40 MB, so direct `BYTEA` storage keeps
the file lifecycle simple. Future list queries should select metadata columns
without loading `pdf_data`.

## Local PostgreSQL

From the repository root:

```bash
docker compose up -d postgres
docker compose ps postgres
```

The Compose service uses database, user, and password `board_game_rules` and is
available at `127.0.0.1:55432`. Its data is retained in the `postgres_data`
volume.

Run the real integration suite with:

```bash
TEST_DATABASE_URL=postgresql://board_game_rules:board_game_rules@127.0.0.1:55432/board_game_rules npm test -w @board-game-rules-assistant/database
```

The API can avoid PostgreSQL for lightweight local work by setting
`PERSISTENCE_DRIVER=memory`. PostgreSQL mode does not support callback filters,
and vector insertion is append-oriented without deduplication or replacement.
Persisted PDF retrieval and deletion endpoints are not part of the upload-only
phase.
