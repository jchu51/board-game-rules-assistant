# Board Game Rules Assistant

A full-stack TypeScript app for uploading board-game rulebook PDFs and building
toward source-backed rules Q&A.

The current slice lets a user upload PDF rulebooks, durably index them in
PostgreSQL with pgvector, search those indexed chunks, and use an Ask screen that
returns an agent-generated answer with retrieved source snippets. RAG primitives
and agent primitives live in shared packages so the API can grow this flow
without tying those pieces directly to Express.

## Current Features

- React Ask and Library pages
- Express API with health, rulebook upload/list/delete, and retrieval endpoints
- Multipart PDF upload with file type and size validation
- PDF loading, chunking, embeddings, and PostgreSQL/pgvector indexing
- Similarity search over indexed rulebook chunks
- Rule-question classification with a public-search fallback when indexed
  rulebook context has no relevant match
- Agent-core package with prompt and LangChain agent primitives
- In-memory rulebook repository for the current API process
- Local Swagger UI for API exploration
- Docker Compose setup for running web and API together

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
        infrastructure/          # OpenAPI and persistence adapters
        presentation/http/        # Express app, routers, and HTTP contracts
    packages/
      agent-core/
        src/
          agents/                 # LangChain-backed agent primitives
          llm/                    # chat model initialization helper
          prompts/                # reusable prompt templates
      rag-core/
        src/
          chunking/               # document splitting
          documents/              # shared document types
          embeddings/             # embedding model factories
          loaders/                # PDF loading
          vector-store/           # vector-store interface/adapters
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
```

For the web app, the default API URL is `http://127.0.0.1:8000`. Override it
with `VITE_API_BASE_URL` if needed.

`PUBLIC_SEARCH_INCLUDE_DOMAINS` is a comma-separated allowlist passed to
Tavily. Configure it with trusted board-game sites to prevent fallback searches
from returning unrelated domains. If it is unset, Tavily searches are not
restricted by domain.

## Persistence and local startup

Install dependencies from the project root:

```bash
npm install
```

Normal durable local mode:

```bash
docker compose up -d postgres
npm run db:migrate -w @board-game-rules-assistant/database
npm run dev:api
```

Migrations must finish before the API starts. Production must use PostgreSQL and
must run the same migration command as a release step before deploying the new
API. A managed PostgreSQL service must support the `vector` extension and permit
`CREATE EXTENSION vector`; the migrations create it and the complete schema.

For lightweight development that deliberately resets all users, documents,
vectors, conversations, messages, and citations on every restart:

```bash
PERSISTENCE_DRIVER=memory npm run dev:api
```

Memory mode is rejected in production. To verify the durable workflow locally
without OpenAI or Tavily credentials, run `npm run test:persistence`. It starts
PostgreSQL, migrates both the normal database and a clean isolated test database,
uses deterministic embeddings, proves restart durability and guest cleanup, and
leaves PostgreSQL running for inspection.

Account role and subscription tier are separate: `admin` grants global rulebook
verification/publication, while `standard` and `pro` determine customer quotas.
Standard users may own at most three active private PDF documents; Pro users are
unlimited; guests cannot upload. Guest sessions and their conversations expire
after seven days and should be removed by the cleanup job. Uploaded PDF bytes are
temporary and are deleted after ingestion; PostgreSQL stores metadata, extracted
chunks, vectors, conversation history, and citations, not the original PDF.

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
questions. PostgreSQL mode durably retains conversation messages and citations
across API restarts; selecting **New chat** creates a fresh thread. Memory mode
deliberately resets them when the API restarts.

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
npm run build -w @board-game-rules-assistant/agent-core
npm run build -w @board-game-rules-assistant/rag-core
npm run typecheck -w api
npm run typecheck -w @board-game-rules-assistant/agent-core
npm run typecheck -w @board-game-rules-assistant/rag-core
```

## Current Limitations

- Rulebook records are stored in memory and reset when the API process restarts.
- Uploaded PDF files are removed after ingestion.
- Vector-store deletion is not implemented yet.
- The Ask UI currently returns an agent-generated answer plus retrieval-backed
  source snippets.
- Request classification uses a maintained keyword and known-game list rather
  than the indexed rulebook catalog or an LLM classifier.
- Citation verification, auth, and persistence are planned future work.
