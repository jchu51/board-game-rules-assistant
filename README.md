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

```bash
cd apps/web
npm install
npm run dev
```

Then open the local URL printed by Vite, usually:

```text
http://localhost:5173
```

## Useful Commands

Run from `apps/web`:

```bash
npm run dev      # start local development server
npm run build    # type-check and build production assets
npm run lint     # run oxlint
npm run preview  # preview the production build
```

## Notes

The upload/indexing behavior is currently mocked in the frontend. A future
backend should handle PDF extraction, chunking, embedding, retrieval, citation
verification, and answer generation.
