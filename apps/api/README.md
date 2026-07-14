# API App

Express API for the Board Game Rules Assistant.

The API accepts rulebook PDF uploads, extracts and chunks PDF text through
`rag-core`, creates embeddings, stores vectors in memory or PostgreSQL/pgvector,
persists original PDFs in PostgreSQL, returns rulebook summaries for the
frontend, and exposes similarity search over indexed chunks.

## Stack

- Express 5
- TypeScript
- Zod
- Multer
- Swagger UI Express
- `@board-game-rules-assistant/rag-core`
- `@board-game-rules-assistant/agent-core`
- `@board-game-rules-assistant/database`

## Environment

Copy the example file:

```bash
cp .env.example .env
```

Required local values:

```bash
NODE_ENV=local
HOST=127.0.0.1
PORT=8000
CORS_ORIGIN=http://localhost:5173
OPENAI_API_KEY=your_api_key
TAVILY_API_KEY=your_api_key
PUBLIC_SEARCH_INCLUDE_DOMAINS=catan.com,boardgamegeek.com
AGENT_CHAT_MODEL=openai:gpt-4o-mini
INGESTION_EMBEDDING_MODEL=text-embedding-3-large
INGESTION_CHUNK_SIZE=500
INGESTION_CHUNK_OVERLAP=100
INGESTION_UPLOAD_DIRECTORY=../../storage/uploads
INGESTION_MAX_UPLOAD_SIZE_BYTES=41943040
PERSISTENCE_DRIVER=memory
DATABASE_URL=
PERSISTENCE_MAX_MESSAGES=20
```

`NODE_ENV=local` enables Swagger UI. Docs are not mounted in `development`,
`test`, or `production`.

`PUBLIC_SEARCH_INCLUDE_DOMAINS` is optional. When set, it is parsed as a
comma-separated list and applied to Tavily fallback searches. Use trusted
board-game domains; leaving it unset permits results from any domain.

`PERSISTENCE_DRIVER=memory` is the lightweight local default and keeps vectors,
conversations, and uploaded PDFs process-local. Set it to `postgres` with
`DATABASE_URL` to persist all three. Production configuration rejects the
memory driver.

## Start

From the repository root:

```bash
npm run dev:api
```

Or from this workspace:

```bash
npm run dev
```

The API listens on:

```text
http://127.0.0.1:8000
```

## Endpoints

```text
GET    /health
POST   /chats
GET    /chats
GET    /chats/:id
DELETE /chats/:id
POST   /rulebooks
GET    /rulebooks
DELETE /rulebooks/:id
POST   /retrieval/search
```

Upload example:

```bash
curl -X POST http://127.0.0.1:8000/rulebooks \
  -F "gameName=Catan" \
  -F "file=@/path/to/catan-rulebook.pdf"
```

The upload is synchronous. It returns success only after embedding finishes and
the selected rulebook repository saves the original PDF. The PostgreSQL
repository stores the complete file bytes in `rulebooks.pdf_data`; the temporary
upload file is then removed.

Retrieval example:

```bash
curl -X POST http://127.0.0.1:8000/retrieval/search \
  -H "Content-Type: application/json" \
  -d '{"conversationId":"11111111-1111-4111-8111-111111111111","query":"How many resources does a city produce?"}'
```

Reuse the same `conversationId` for follow-up questions. The API keeps the most
recent 20 user and assistant messages for each conversation in the selected
persistence adapter. A new identifier starts an isolated chat. With PostgreSQL,
conversation history and vectors survive API restarts.

The retrieval flow first rejects clearly out-of-scope requests with a
lightweight keyword classifier. Recognized `how to play <game>` requests, such
as `how to play Everdell?`, are accepted without making generic `play` queries
like `How do I play the guitar?` in scope. When vector retrieval has no relevant
match, accepted questions may use Tavily public search, constrained by
`PUBLIC_SEARCH_INCLUDE_DOMAINS` when configured.

Docs in local mode:

```text
http://127.0.0.1:8000/docs
http://127.0.0.1:8000/openapi.json
http://127.0.0.1:8000/openapi.yml
```

## Commands

```bash
npm run dev
npm run build
npm run start
npm run test
npm run typecheck
npm run lint
```

## Source Layout

```text
src/
  main.ts                        # dependency wiring and server lifecycle
  application/                   # use-case services and application types
    ingestion/                   # PDF ingestion workflow
    retrieval/                   # vector search + agent answer workflow
  config/                        # env schema, config type, config singleton
  domain/                        # domain contracts and domain errors
    ingestion/                   # ingestion domain errors
    conversation/               # chat and message repository contract
    rulebook/                    # rulebook repository contract
  infrastructure/                # adapters for external/storage concerns
    openapi/                     # OpenAPI document loading
    persistence/                 # driver composition and repository adapters
  presentation/http/             # Express routers and HTTP schemas
    app.ts                       # Express app factory
    docs/                        # local-only Swagger/OpenAPI routes
    health/                      # health endpoint contract/router
    ingestion/                   # rulebook upload/list/delete HTTP layer
    retrieval/                   # retrieval HTTP layer
    shared/                      # HTTP status, typed responses, error middleware
```

## Current Limitations

- `GET /rulebooks` lists persisted metadata without loading PDF bytes.
- `DELETE /rulebooks/:id` removes persisted metadata and PDF bytes.
- Vector-store deletion is not implemented yet.
- Temporary uploaded files are deleted after ingestion and repository
  persistence.
- No endpoint returns the persisted PDF bytes yet.
- Retrieval returns matching chunks, metadata, and an agent-generated answer.
- Request classification relies on a maintained keyword and known-game list;
  it is not yet derived from indexed rulebooks or an LLM classifier.
- PostgreSQL vector callback filters and vector deduplication/replacement are
  not supported in this slice.
