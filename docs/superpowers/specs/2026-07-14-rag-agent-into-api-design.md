# RAG and Agent Packages into API Design

## Goal

Move `apps/packages/rag-core` and `apps/packages/agent-core` into `apps/api`
without changing runtime behavior, HTTP contracts, prompts, retrieval behavior,
PDF processing, embeddings, or vector-store semantics.

## Architecture

The RAG primitives will live under `apps/api/src/infrastructure/rag`, retaining
their current responsibility-based folders for chunking, documents, embeddings,
loaders, and vector stores. Agent implementations, prompts, model helpers, and
context-origin types will live under `apps/api/src/infrastructure/agents`.

Both packages currently have only one runtime consumer: the API. Consolidating
them together removes package boundaries that do not provide reuse while
keeping RAG and agent code separated internally. The existing API application,
domain, presentation, persistence, and database boundaries remain unchanged.

## Source and Test Moves

- Move `apps/packages/rag-core/src/**` to
  `apps/api/src/infrastructure/rag/**`.
- Move `apps/packages/agent-core/src/**` to
  `apps/api/src/infrastructure/agents/**`.
- Move RAG tests to `apps/api/tests/rag/**`.
- Move agent tests to `apps/api/tests/agents/**`.
- Replace package imports in API production code and tests with local relative
  imports.
- Preserve each moved module's existing API and behavior.

The package-level barrel files are not required after consolidation. API code
will import from focused local modules or local folder barrels where those
barrels continue to improve readability.

## Dependencies and Workspace Configuration

Transfer the external runtime dependencies required by both packages into
`apps/api/package.json`, preserving their current compatible versions:

- `@langchain/classic`
- `@langchain/core`
- `@langchain/langgraph`
- `@langchain/openai`
- `@langchain/textsplitters`
- `langchain`
- `pdfjs-dist`

Remove the API dependencies on both internal packages. Delete both package
directories and refresh `package-lock.json`. Remove package-specific build
commands from Docker Compose and current repository documentation. Historical
design and plan documents remain unchanged.

## Runtime and Build Behavior

The API remains bundled with `tsup`. The moved modules become part of the API
bundle through local imports, so no separate package build is required. The
existing OpenAPI and SQL migration copy steps remain unchanged.

Memory and PostgreSQL persistence continue to consume the same vector-store
contract. Ingestion continues to load PDFs, chunk documents, and embed content
using the same functions. Retrieval continues to use the same agents, prompts,
context origins, and answer flow.

## Error Handling

No error contracts change. Existing PDF loader failures, agent error wrapping,
vector-store filter rejection, validation behavior, and HTTP error mapping are
preserved. The consolidation must not add fallback behavior or change error
messages.

## Testing

Use the moved tests as the refactoring safety net:

1. Point moved tests at the intended API-local modules and confirm they fail
   while those modules are absent.
2. Move the production modules and make the targeted RAG and agent suites pass.
3. Update API consumers and package metadata.
4. Run formatting, all repository tests, typechecking, API lint, and the full
   production build.
5. Confirm the built API starts and serves `/health`, then stop it so port 8000
   remains free.

## Non-Goals

- Changing RAG, embedding, chunking, PDF, prompt, or agent behavior.
- Redesigning module APIs or repository boundaries.
- Changing HTTP endpoints or OpenAPI schemas.
- Moving frontend code into the API.
- Refactoring unrelated API application or domain code.
