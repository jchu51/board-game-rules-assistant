# Board Game Rules Assistant

A full-stack TypeScript app for uploading board-game rulebook PDFs and building
toward source-backed rules Q&A.

The current slice lets a user upload PDF rulebooks, index them into an in-memory
vector store, search those indexed chunks, and use a prototype Ask screen that
returns an agent-generated answer with retrieved source snippets. RAG primitives
and agent primitives live in shared packages so the API can grow this flow
without tying those pieces directly to Express.

## Current Features

- React Ask and Library pages
- Express API with health, rulebook upload/list/delete, and retrieval endpoints
- Multipart PDF upload with file type and size validation
- PDF loading, chunking, embeddings, and in-memory vector-store indexing
- Similarity search over indexed rulebook chunks
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
AGENT_CHAT_MODEL=openai:gpt-4o-mini
INGESTION_EMBEDDING_MODEL=text-embedding-3-large
INGESTION_UPLOAD_DIRECTORY=../../storage/uploads
INGESTION_MAX_UPLOAD_SIZE_BYTES=41943040
```

For the web app, the default API URL is `http://127.0.0.1:8000`. Override it
with `VITE_API_BASE_URL` if needed.

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
- Citation verification, auth, and persistence are planned future work.
