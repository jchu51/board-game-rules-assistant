# API App

Express API for the Board Game Rules Assistant.

The API accepts rulebook PDF uploads, extracts and chunks PDF text through
`rag-core`, creates embeddings, stores vectors in memory, and returns rulebook
summaries for the frontend.

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
INGESTION_EMBEDDING_MODEL=text-embedding-3-large
INGESTION_CHUNK_SIZE=500
INGESTION_CHUNK_OVERLAP=100
INGESTION_UPLOAD_DIRECTORY=../../storage/uploads
INGESTION_MAX_UPLOAD_SIZE_BYTES=20971520
```

`NODE_ENV=local` enables Swagger UI. Docs are not mounted in `development`,
`test`, or `production`.

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
POST   /rulebooks
GET    /rulebooks
DELETE /rulebooks/:id
```

Upload example:

```bash
curl -X POST http://127.0.0.1:8000/rulebooks \
  -F "gameName=Catan" \
  -F "file=@/path/to/catan-rulebook.pdf"
```

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
npm run typecheck
npm run lint
```

## Source Layout

```text
src/
  app.ts                         # Express app factory
  main.ts                        # dependency wiring and server lifecycle
  config/                        # env schema, config type, config singleton
  db/rulebook-repository/        # repository interface and in-memory repo
  modules/
    docs/                        # local-only Swagger/OpenAPI routes
    health/                      # health endpoint
    ingestion/                   # rulebook upload/list/delete
  openapi/                       # OpenAPI document loading
  shared/http/                   # HTTP status, typed responses, error middleware
```

## Current Limitations

- Rulebook metadata is stored in memory only.
- Vector-store deletion is not implemented yet.
- Uploaded PDF files are deleted after ingestion.
- Retrieval and answer-generation endpoints are future work.
