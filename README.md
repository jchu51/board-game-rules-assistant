# Board Game Rules Assistant

A full-stack TypeScript app for uploading board-game rulebook PDFs and building
toward source-backed rules Q&A.

The current app lets a user upload and persist PDF rulebooks, index them into a
selectable in-memory or PostgreSQL/pgvector store, manage chat threads, and ask
follow-up questions that return agent-generated answers with source snippets.
RAG and agent primitives live inside the API behind focused infrastructure
modules.

## Current Features

- React Ask and Library pages
- Express API with health, rulebook upload/list/delete, and retrieval endpoints
- Multipart PDF upload with file type and size validation
- PDF loading, chunking, embeddings, and selectable memory/pgvector indexing
- Similarity search over indexed rulebook chunks
- Rule-question classification with a public-search fallback when indexed
  rulebook context has no relevant match
- API-owned prompt and LangChain agent primitives
- Selectable in-memory or PostgreSQL persistence for chats and rulebooks
- PostgreSQL `BYTEA` storage for original uploaded PDFs
- Local Swagger UI for API exploration
- Docker Compose setup for running web and API together
- PostgreSQL/pgvector persistence for conversation history and rulebook vectors

## Architecture

```text
board-game-rules-assistant/
  package.json
  docker-compose.yml
  scripts/
    docker.sh
  apps/
    api/
      src/
        application/             # use-case services and application types
        config/                  # environment parsing and typed app config
        domain/                  # repository contracts and domain errors
        infrastructure/
          agents/                # LangChain agents, prompts, and model helper
          database/              # PostgreSQL pool, migrations, and pgvector
          openapi/               # OpenAPI document loading
          persistence/           # repository and persistence adapters
          rag/                   # PDF, chunking, embeddings, and vector stores
        presentation/http/        # Express app, routers, and HTTP contracts
    web/
      src/
        api/                      # browser API clients
        assets/svgs/              # reusable SVG icon components
        components/               # shared UI and feature components
        domain/                   # frontend domain types
        pages/                    # route-level pages
  docs/
    tech-reviews/
      000-phase-0-single-pdf-rag-agent/
        high-level-design.md
        diagrams/
          phase-0-flow.puml
          phase-0-flow.png
```

See the [Phase 0 flow](docs/tech-reviews/000-phase-0-single-pdf-rag-agent/diagrams/phase-0-flow.png).

![Current system architecture](docs/tech-reviews/004-phase-04-api-consolidation/diagrams/phase-04-consolidated-architecture.png)

[Current architecture PlantUML source](docs/tech-reviews/004-phase-04-api-consolidation/diagrams/phase-04-consolidated-architecture.puml)

See the
[Phase 04 API consolidation HLD](docs/tech-reviews/004-phase-04-api-consolidation/high-level-design.md)
for the current server-side folder boundaries and the rationale for moving
database, RAG, and agent modules into the API.

See the
[Phase 02 PostgreSQL and pgvector HLD](docs/tech-reviews/002-phase-02-postgres-pgvector-persistence/high-level-design.md)
for persistence boundaries, decisions, rollout, and known risks.

See the
[Phase 01 Tavily retrieval low-level design](docs/tech-reviews/001-phase-01-tavily-public-search/low-level-design.md)
for the implemented classification, relevance, clarification, and public-search
decision flow.

## Requirements

- Node.js 22+
- npm
- OpenAI API key for ingestion embeddings
- Docker, optional

## Environment

Copy the API example environment file:

```bash
cp apps/api/.env.example apps/api/.env
```

Important values:

```bash
NODE_ENV=local
HOST=127.0.0.1
PORT=8000
CORS_ORIGIN=http://localhost:5173
OPENAI_API_KEY=your_api_key
TAVILY_API_KEY=your_api_key
PUBLIC_SEARCH_INCLUDE_DOMAINS=catan.com,boardgamegeek.com # optional allowlist for the public-search fallback
AGENT_CHAT_MODEL=openai:gpt-4o-mini
INGESTION_EMBEDDING_MODEL=text-embedding-3-large
INGESTION_UPLOAD_DIRECTORY=../../storage/uploads
INGESTION_MAX_UPLOAD_SIZE_BYTES=41943040
PERSISTENCE_DRIVER=memory
DATABASE_URL=
PERSISTENCE_MAX_MESSAGES=20
```

For the web app, the default API URL is `http://127.0.0.1:8000`. Override it
with `VITE_API_BASE_URL` if needed.

`PUBLIC_SEARCH_INCLUDE_DOMAINS` is a comma-separated allowlist passed to
Tavily. Configure it with trusted board-game sites to prevent fallback searches
from returning unrelated domains. If it is unset, Tavily searches are not
restricted by domain.

## Start Locally

Install dependencies from the project root:

```bash
npm install
```

Start the API:

```bash
npm run dev:api
```

Start the web app in another terminal:

```bash
npm run dev:web
```

Open:

```text
http://localhost:5173
```

## Start With Docker

```bash
./scripts/docker.sh
```

Docker Compose starts PostgreSQL 17 with pgvector, waits for it to become
healthy, and starts the API with `PERSISTENCE_DRIVER=postgres`. PostgreSQL is
available to the host on port `55432`; the API connects inside Compose at
`postgres:5432`. Conversation messages and vectors survive container restarts
in the named `postgres_data` volume. `docker compose down -v` removes that data.

For a lightweight process-local run without PostgreSQL, use
`PERSISTENCE_DRIVER=memory` and leave `DATABASE_URL` unset.

Useful Docker commands:

```bash
./scripts/docker.sh down
./scripts/docker.sh logs
./scripts/docker.sh restart
```

## API

Base URL:

```text
http://127.0.0.1:8000
```

Endpoints:

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

Example upload:

```bash
curl -X POST http://127.0.0.1:8000/rulebooks \
  -F "gameName=Catan" \
  -F "file=@/path/to/catan-rulebook.pdf"
```

Local API docs:

```text
http://127.0.0.1:8000/docs
http://127.0.0.1:8000/openapi.json
http://127.0.0.1:8000/openapi.yml
```

Swagger docs are only mounted when the API runs with `NODE_ENV=local`.

The Ask page creates a conversation identifier and reuses it for follow-up
questions. The API retains up to 20 recent messages per conversation in the
selected persistence adapter. Selecting **New chat** creates a fresh thread.
History resets on API restart only when the memory driver is selected.

### Request classification and fallback search

Before retrieval, the API uses a lightweight keyword classifier to reject
clearly unrelated questions. It accepts rules-oriented questions and recognized
`how to play <game>` questions, including `how to play Everdell?`. Generic uses
of the same language, such as `How do I play the guitar?`, remain out of scope.

If no sufficiently relevant indexed rulebook chunks are found, an in-scope
question can fall back to Tavily public search. The classifier is intentionally
heuristic, so `PUBLIC_SEARCH_INCLUDE_DOMAINS` is the practical safety boundary
until classification is backed by indexed-game metadata or an LLM classifier.

## Useful Commands

Run from the project root:

```bash
npm run dev:web
npm run dev:api
npm run typecheck
npm run build
```

Workspace commands:

```bash
npm run build -w web
npm run build -w api
npm run typecheck -w api
TEST_DATABASE_URL=postgresql://board_game_rules:board_game_rules@127.0.0.1:55432/board_game_rules npm test -w api -- tests/database
```

## Current Limitations

- Memory-driver chats, rulebooks, PDFs, and vectors reset when the API process
  restarts; PostgreSQL mode persists them.
- Temporary upload files are removed after ingestion; the selected rulebook
  repository retains the PDF bytes.
- Vector-store deletion is not implemented yet.
- The Ask UI currently returns an agent-generated answer plus retrieval-backed
  source snippets.
- Request classification uses a maintained keyword and known-game list rather
  than the indexed rulebook catalog or an LLM classifier.
- Citation verification and auth are planned future work.
- PostgreSQL vector callback filters and vector deduplication/replacement are
  not supported in this slice; vector insertion is append-oriented.
