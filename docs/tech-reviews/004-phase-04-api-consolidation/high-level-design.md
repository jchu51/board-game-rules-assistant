# Phase 04 API Consolidation — High-Level Design

|             |                                                                  |
| ----------- | ---------------------------------------------------------------- |
| **Status**  | `IMPLEMENTED`                                                    |
| **Date**    | 2026-07-14                                                       |
| **Context** | Consolidate API-only database, RAG, and agent workspace packages |

---

## Problem Statement

The database, RAG, and agent modules were implemented as independent npm
workspace packages even though the Express API was their only runtime consumer.
That structure required separate package manifests, builds, TypeScript projects,
Vitest projects, Docker startup steps, and cross-package imports without creating
a meaningful deployment or reuse boundary.

## Prior State

The repository contained three API-only packages under `apps/packages`:

- `database` owned migrations, the shared PostgreSQL pool, and the pgvector
  adapter;
- `rag-core` owned PDF loading, chunking, embeddings, document types, and vector
  abstractions;
- `agent-core` owned prompts, chat-model setup, context filtering, rule answers,
  and conversation-title generation.

The API imported all three packages and Docker Compose built them before starting
the API or web development server. Runtime requests already executed within one
API process, so the package boundaries did not provide runtime isolation.

## Scope

### In Scope

- Move database, RAG, and agent code into focused API infrastructure modules.
- Move their unit and integration tests into the API Vitest project.
- Transfer their external dependencies into `apps/api/package.json`.
- Remove obsolete package builds, manifests, workspace links, and Docker steps.
- Preserve the existing application, domain, presentation, and infrastructure
  boundaries inside the API.
- Preserve all runtime behavior and HTTP contracts.

### Out of Scope

- Changing ingestion, retrieval, title generation, or public-search behavior.
- Changing database tables, migrations, or persistence semantics.
- Combining the React web application with the API workspace.
- Replacing LangChain, PostgreSQL, pgvector, OpenAI, or Tavily.
- Redesigning API endpoints or response schemas.

### Non-Goals

- The consolidated modules are not intended to become a general-purpose SDK.
- This phase does not optimize bundle size or introduce independent deployment
  units.
- This phase does not flatten all code into one folder; internal boundaries stay
  explicit.

### Assumptions

- The API remains the only consumer of the database, RAG, and agent modules.
- A future non-API consumer can justify extracting a package when that consumer
  exists and requires a stable public contract.
- The API continues to deploy as one Node.js process.

---

## Goals & Success Criteria

| Goal                                    | Success Metric                           | Target                                                     |
| --------------------------------------- | ---------------------------------------- | ---------------------------------------------------------- |
| Remove unnecessary workspace boundaries | API-only internal packages               | 0                                                          |
| Simplify builds                         | Package builds required before API start | 0                                                          |
| Preserve behavior                       | Existing automated tests                 | 100% passing                                               |
| Preserve deployment shape               | HTTP and persistence contracts changed   | 0                                                          |
| Keep internal ownership clear           | Focused API infrastructure modules       | Database, RAG, agents, persistence, public search, OpenAPI |

---

## Recommended Solution

### Diagram Decision

A new architecture diagram is required because the runtime data flow is similar
to Phase 02, but the source and build boundaries changed materially. The diagram
shows the API layers and the former packages as focused modules inside
`src/infrastructure`.

![Phase 04 consolidated architecture](./diagrams/phase-04-consolidated-architecture.png)

[PlantUML source](./diagrams/phase-04-consolidated-architecture.puml)

### Description

Keep `apps/web` and `apps/api` as the two application workspaces. Within the API,
retain layered ownership:

```text
apps/api/
  migrations/                         # ordered PostgreSQL schema migrations
  src/
    application/                      # ingestion and retrieval workflows
    config/                           # environment parsing and typed config
    domain/                           # repository contracts and domain errors
    infrastructure/
      agents/
        agents/                       # answer, context, and title agents
        llm/                          # chat model initialization
        prompts/                      # LangChain prompt templates
      database/
        vector/                       # PGVectorStore adapter
        migrations.ts                 # ordered migration runner
        persistence.ts                # shared pool and database lifecycle
      openapi/                        # OpenAPI document loading
      persistence/
        conversation/                 # memory and PostgreSQL repositories
        rulebook/                     # memory and PostgreSQL repositories
        create-persistence.ts         # persistence driver composition
      public-search/                  # Tavily adapter
      rag/
        chunking/                     # document splitting
        documents/                    # rulebook document metadata types
        embeddings/                   # embedding model factory
        loaders/                      # PDF parsing and loading
        vector-store/                 # vector contract and memory adapter
    presentation/http/                # Express routers, schemas, and middleware
  tests/
    agents/                           # agent and prompt unit tests
    database/                         # PostgreSQL and pgvector integration tests
    rag/                              # RAG unit tests
```

Application services depend on focused local modules instead of package barrels.
The persistence composition selects memory or PostgreSQL adapters at startup.
Database infrastructure owns the shared pool and migrations, while repository
adapters remain grouped by domain entity. RAG and agent modules remain separate
because they have different responsibilities and dependencies even though they
share the API workspace.

### Pros

- One API build and TypeScript project covers every server-side module.
- Local imports expose dependencies and ownership more directly.
- Docker startup no longer compiles internal packages before launching apps.
- Tests run in one API project while remaining grouped by capability.
- Removing package barrels discourages accidental public-API coupling.
- A future extraction remains possible if a real second consumer appears.

### Cons

- Infrastructure modules can now import each other without npm package
  boundaries enforcing separation.
- The API manifest owns more third-party dependencies.
- Re-extracting a module later will require defining and versioning a public
  contract at that time.

### Risks & Assumptions

| Risk/Assumption                                  | Likelihood | Impact | Mitigation                                                                      |
| ------------------------------------------------ | ---------- | ------ | ------------------------------------------------------------------------------- |
| Internal module boundaries erode over time       | Medium     | Medium | Keep focused folders, use direct imports, and review dependency direction.      |
| A second consumer later needs RAG or agent code  | Low        | Medium | Extract only the required module after its shared contract is known.            |
| Moving files changes runtime behavior            | Low        | High   | Preserve implementations and execute existing tests before and after each move. |
| Build misses non-code assets                     | Low        | High   | Keep the API build copying OpenAPI and SQL migrations into `dist`.              |
| Documentation continues showing removed packages | Medium     | Low    | Point the root README at this HLD and its rendered architecture diagram.        |

### Dependencies

- Node.js and npm workspaces
- Express and tsup
- LangChain packages and PDF.js
- PostgreSQL 17 with pgvector
- OpenAI embedding and chat APIs
- Tavily Search API

### Estimate of Effort

| Size  | Confidence | Notes                                                                         |
| ----- | ---------- | ----------------------------------------------------------------------------- |
| Small | High       | Mechanical consolidation with existing tests and no runtime contract changes. |

---

## Rollout Strategy

1. Move database infrastructure and its tests into the API, then verify the full
   persistence suite.
2. Move RAG tests, confirm they fail against absent local modules, move the RAG
   implementation, and restore GREEN.
3. Repeat the RED/GREEN process for agent modules.
4. Transfer dependencies, remove the packages, and update workspace, Vitest, and
   Docker configuration.
5. Run formatting, all tests, typechecking, lint, production builds, Docker
   validation, and an API health smoke test.

The work was committed directly to `master` in independently verified steps.

## Rollback Plan

Revert the consolidation commits in reverse order to restore package manifests,
workspace links, imports, and Docker build commands. No database rollback is
required because schemas and persisted data did not change. Expected recovery
time is under 30 minutes, including dependency installation and verification.

## Testing & Validation Approach

- Preserve and relocate all RAG, agent, database, and API tests.
- Use explicit RED/GREEN checks for moved RAG and agent test suites.
- Run PostgreSQL integration tests against the local pgvector container.
- Run the complete repository suite after removing the packages.
- Run TypeScript checking, API lint, production API and web builds, formatting,
  and `docker compose config --quiet`.
- Start the built API, verify `/health`, stop it, and confirm port 8000 is free.

## Open Questions

- [ ] Should import-boundary lint rules be added if infrastructure modules begin
      developing circular or inappropriate dependencies?
- [ ] Should `apps/packages` be removed entirely now that it has no current
      application packages?

## Other Solutions Considered

### Do Nothing (Status Quo)

Keep the database, RAG, and agent packages. This preserves compile-time package
boundaries but retains three builds, manifests, test projects, and workspace
links for modules with no independent consumers or deployments.

### Move Only the Database Package

Moving database infrastructure alone reduces some overhead but leaves RAG and
agent packages with the same single-consumer problem. It is a useful incremental
step but not the desired final architecture.

### Keep One Shared Server-Core Package

Combine database, RAG, and agents into one package consumed by the API. This
reduces the workspace count but preserves an artificial package boundary and
creates a broad package with unrelated responsibilities.

### Flatten Everything into the API Root

Move all modules into `src` without capability folders. This removes package
overhead but weakens ownership and makes the codebase harder to navigate. The
recommended solution consolidates deployment while retaining focused internal
boundaries.
