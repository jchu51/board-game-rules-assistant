# API App

Express API for the Board Game Rules Assistant.

The API accepts rulebook PDF uploads, extracts and chunks PDF text through
`rag-core`, creates embeddings, stores vectors in PostgreSQL/pgvector, returns rulebook
summaries for the frontend, and exposes similarity search over indexed chunks.

## Stack

- Express 5
- TypeScript
- Zod
- Multer
- Swagger UI Express
- `@board-game-rules-assistant/rag-core`

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
```

`NODE_ENV=local` enables Swagger UI. Docs are not mounted in `development`,
`test`, or `production`.

`PUBLIC_SEARCH_INCLUDE_DOMAINS` is optional. When set, it is parsed as a
comma-separated list and applied to Tavily fallback searches. Use trusted
board-game domains; leaving it unset permits results from any domain.

## Start

From the repository root, start and migrate PostgreSQL before the API:

```bash
docker compose up -d postgres
npm run db:migrate -w @board-game-rules-assistant/database
npm run dev:api
```

For a lightweight reset-on-restart process, use
`PERSISTENCE_DRIVER=memory npm run dev:api`. Memory persistence is prohibited in
production. Production releases must run migrations before starting the API,
and managed PostgreSQL must provide pgvector with permission to create the
`vector` extension.

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

Retrieval example:

```bash
curl -X POST http://127.0.0.1:8000/retrieval/search \
  -H "Content-Type: application/json" \
  -d '{"conversationId":"11111111-1111-4111-8111-111111111111","query":"How many resources does a city produce?"}'
```

Reuse the same `conversationId` for follow-up questions. PostgreSQL mode keeps
conversation messages and citations across API restarts. A new identifier starts
an isolated chat; only memory mode loses conversation history on restart.

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
    rulebook/                    # rulebook repository contract
  infrastructure/                # adapters for external/storage concerns
    openapi/                     # OpenAPI document loading
    persistence/                 # persistence and external-service adapters
  presentation/http/             # Express routers and HTTP schemas
    app.ts                       # Express app factory
    docs/                        # local-only Swagger/OpenAPI routes
    health/                      # health endpoint contract/router
    ingestion/                   # rulebook upload/list/delete HTTP layer
    retrieval/                   # retrieval HTTP layer
    shared/                      # HTTP status, typed responses, error middleware
```

## Persistence policy

- Role and tier are independent. Admin role controls global publish; Standard
  and Pro tiers control customer limits.
- Standard users can own three active private PDFs, Pro users have no document
  quota, and guests cannot upload.
- Guest sessions expire after seven days; schedule the database package's
  `cleanup:guests` command to cascade-delete their conversations.
- Uploaded PDF files are temporary and deleted after ingestion. Only metadata,
  extracted chunks/vectors, messages, and citations persist.
- Retrieval returns matching chunks, metadata, and an agent-generated answer.
- Request classification relies on a maintained keyword and known-game list;
  it is not yet derived from indexed rulebooks or an LLM classifier.
