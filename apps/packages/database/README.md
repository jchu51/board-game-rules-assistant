# Database Package

PostgreSQL persistence for conversation history and rulebook vectors. The
package owns one shared `pg.Pool`, runs ordered SQL migrations, and adapts
LangChain `PGVectorStore` to the `rag-core` vector-store contract.

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
