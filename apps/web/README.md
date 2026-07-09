# Web App

React frontend for the Board Game Rules Assistant.

The app includes an Ask screen for rules questions and a Library screen for
uploading and managing indexed PDF rulebooks.

## Stack

- React 19
- Vite
- TypeScript
- Tailwind CSS v4
- shadcn-style local UI components
- Oxlint

## Environment

The API client defaults to:

```text
http://127.0.0.1:8000
```

Override it with:

```bash
VITE_API_BASE_URL=http://127.0.0.1:8000
```

## Start

From the repository root:

```bash
npm install
npm run dev:web
```

Or from this workspace:

```bash
npm run dev
```

Open:

```text
http://localhost:5173
```

## Commands

```bash
npm run dev
npm run build
npm run lint
npm run preview
```

## Source Layout

```text
src/
  api/
    rulebook-api.ts              # fetch client for /rulebooks endpoints
  assets/svgs/                   # reusable SVG icon components
  components/
    app-shell.tsx                # sidebar shell and route outlet
    rulebook-upload/             # upload page components
    ui/                          # local shadcn-style primitives
  domain/
    rulebook.ts                  # frontend rulebook types
  pages/
    ask-page.tsx                 # route-level Ask page
    upload-page.tsx              # route-level Library page
```

## User Flow

1. User opens `/ask` to ask a board-game rules question.
2. User opens `/library` to enter a game name and select a PDF file.
3. The Library page posts `multipart/form-data` to `POST /rulebooks`.
4. The API returns the indexed rulebook summary.
5. The Library page refreshes the rulebook list from `GET /rulebooks`.
6. A rulebook can be removed with `DELETE /rulebooks/:id`.

## Notes

- The API currently stores rulebook records in memory.
- A failed local upload row is removed locally without calling delete, because
  no backend rulebook id exists yet.
