# Board Game Rules Assistant

A board-game rules assistant for uploading rulebook PDFs and eventually asking
rules questions with source-backed citations.

The current app is the first frontend slice: a rulebook upload screen where a
user can enter a game name, select a PDF, and see indexed rulebooks in a simple
library list.

## Project Status

This project is early-stage. The frontend upload experience exists, while the
backend rulebook processing and question-answering flow is still planned.

## Current Features

- Upload-page UI for rulebook PDFs
- PDF validation by file type and size
- Simulated indexing progress
- Rulebook library list with ready, indexing, and failed states
- React + Vite frontend
- shadcn-style local UI components
- Tailwind CSS v4 styling

## Project Structure

```text
board-game-rules-assistant/
  apps/
    api/                 # Express API app
      src/
        modules/         # API feature modules and routers
    web/                 # React frontend app
      src/
        assets/svgs/     # reusable SVG icon components
        components/      # shared UI and feature components
        domain/          # frontend domain types and constants
        pages/           # route-level pages
  docs/                  # product and architecture notes
```

## Requirements

- Node.js 20+
- npm

## Start The Web App

With Docker Compose:

```bash
./scripts/docker.sh
```

Then open the web app:

```text
http://localhost:5173
```

The API health endpoint is available at:

```text
http://127.0.0.1:8000/health
```

Or run it locally with Node:

```bash
cd apps/web
npm install
npm run dev
```

Then open the local URL printed by Vite, usually:

```text
http://localhost:5173
```

## Start The API

```bash
cd apps/api
npm install
npm run dev
```

The API starts on:

```text
http://127.0.0.1:8000
```

Health check:

```bash
curl http://127.0.0.1:8000/health
```

API docs:

```text
http://127.0.0.1:8000/docs
http://127.0.0.1:8000/openapi.json
http://127.0.0.1:8000/openapi.yml
```

Swagger docs are only mounted when the API runs with `NODE_ENV=local`. They are
not exposed in `development`, `test`, or `production`.

## Useful Commands

Run from `apps/web`:

```bash
npm run dev      # start local development server
npm run build    # type-check and build production assets
npm run lint     # run oxlint
npm run preview  # preview the production build
```

Run from `apps/api`:

```bash
npm run dev        # start API with nodemon + tsx
npm run build      # compile TypeScript to dist
npm run start      # run compiled API
npm run typecheck  # type-check without emitting files
```

Run Docker Compose from the project root:

```bash
./scripts/docker.sh          # start web and api with docker compose
./scripts/docker.sh down     # stop containers
./scripts/docker.sh logs     # follow container logs
./scripts/docker.sh restart  # rebuild and restart
```

## Notes

The upload/indexing behavior is currently mocked in the frontend. A future
backend should handle PDF extraction, chunking, embedding, retrieval, citation
verification, and answer generation.
