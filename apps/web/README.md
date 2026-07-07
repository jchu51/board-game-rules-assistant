# Web App

React frontend for the Board Game Rules Assistant.

The current screen lets a user enter a game name, choose a PDF rulebook, upload
it to the API, and manage the indexed rulebook list.

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
    rulebook-upload/             # upload page components
    ui/                          # local shadcn-style primitives
  domain/
    rulebook.ts                  # frontend rulebook types
  pages/
    upload-page.tsx              # route-level upload page
```

## User Flow

1. User enters a game name.
2. User selects a PDF file.
3. The page posts `multipart/form-data` to `POST /rulebooks`.
4. The API returns the indexed rulebook summary.
5. The page refreshes the rulebook list from `GET /rulebooks`.
6. A rulebook can be removed with `DELETE /rulebooks/:id`.

## Notes

- The API currently stores rulebook records in memory.
- A failed local upload row is removed locally without calling delete, because
  no backend rulebook id exists yet.
