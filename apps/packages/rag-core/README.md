# rag-core

Reusable RAG primitives for the Board Game Rules Assistant.

This package keeps PDF loading, chunking, embeddings, and vector-store adapters
separate from the Express API. The API decides when to call these primitives;
`rag-core` stays framework-agnostic.

## Exports

```ts
import {
  chunkDocuments,
  createOpenAIEmbeddings,
  LangchainMemoryVectorStore,
  loadPdfDocuments,
} from "@board-game-rules-assistant/rag-core";
```

## What Belongs Here

- PDF loading utilities
- Rulebook document types
- Chunking helpers
- Embedding model factories
- Vector-store interfaces
- Vector-store adapters that are reusable outside Express

## What Does Not Belong Here

- Express routers
- HTTP request and response types
- API environment parsing
- User/session persistence
- Product-specific API workflows

## Source Layout

```text
src/
  chunking/
    chunk-documents.ts
  documents/
    rulebook-document.ts
  embeddings/
    embed-text.ts
  loaders/
    pdf-loader.ts
  vector-store/
    vector-store.ts
    langchain-memory-vector-store.ts
```

## Commands

```bash
npm run build
npm run test
npm run typecheck
```

From the repository root:

```bash
npm run build -w @board-game-rules-assistant/rag-core
npm run test -w @board-game-rules-assistant/rag-core
npm run typecheck -w @board-game-rules-assistant/rag-core
```

## Notes

- The current vector store adapter uses LangChain's memory vector store.
- The memory store is useful for learning and local development, but production
  should use a persistent store.
- Because this package is ESM with Node-style module resolution, source imports
  use explicit `.js` extensions.
