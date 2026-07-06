# Web App

React frontend for the Board Game Rules Assistant.

## Stack

- React
- Vite
- TypeScript
- Tailwind CSS v4
- shadcn-style local UI components
- Oxlint

## Start

```bash
npm install
npm run dev
```

## Commands

```bash
npm run dev      # local dev server
npm run build    # TypeScript build + Vite build
npm run lint     # oxlint
npm run preview  # preview production build
```

## Source Layout

```text
src/
  assets/svgs/                 # reusable SVG icons
  components/ui/               # local shadcn-style primitives
  components/rulebook-upload/  # upload-page feature components
  domain/                      # app domain types and constants
  pages/                       # route pages
```
