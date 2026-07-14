# RAG and Agent Packages into API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the RAG and agent workspace packages into the API without changing behavior or HTTP contracts.

**Architecture:** Preserve the packages' internal module boundaries under `apps/api/src/infrastructure/rag` and `apps/api/src/infrastructure/agents`. Move their tests into the API project, replace package imports with local module imports, transfer external dependencies to the API, and remove the obsolete workspace packages and build steps.

**Tech Stack:** TypeScript, Node.js ESM, Express, LangChain, PDF.js, Vitest, tsup, npm workspaces

## Global Constraints

- Preserve all current RAG, agent, prompt, PDF, embedding, and vector-store behavior.
- Preserve all HTTP endpoints, schemas, responses, and error contracts.
- Keep `apps/api/src/infrastructure/rag` and `apps/api/src/infrastructure/agents` as separate internal boundaries.
- Do not change historical design or plan documents.
- Work directly on `master`, as previously requested by the user.
- Keep the API stopped after the final smoke test.

---

### Task 1: Move RAG Tests and Establish RED

**Files:**
- Create: `apps/api/tests/rag/chunk-documents.test.ts`
- Create: `apps/api/tests/rag/embed-text.test.ts`
- Create: `apps/api/tests/rag/langchain-memory-vector-store.test.ts`
- Create: `apps/api/tests/rag/pdf-loader.test.ts`

**Interfaces:**
- Consumes: existing test behavior from `apps/packages/rag-core/tests/**`
- Produces: tests importing API-local modules under `src/infrastructure/rag`

- [ ] **Step 1: Copy the RAG tests into the API test project**

Preserve every test case and assertion. Change imports to these local modules:

```ts
import { chunkDocuments } from "../../src/infrastructure/rag/chunking/chunk-documents";
import { createOpenAIEmbeddings } from "../../src/infrastructure/rag/embeddings/embed-text";
import { parsePdfDocuments } from "../../src/infrastructure/rag/loaders/pdf-loader";
import { LangchainMemoryVectorStore } from "../../src/infrastructure/rag/vector-store/langchain-memory-vector-store";
```

Import `RulebookDocument` and vector-store types from their focused local files
rather than from the removed package barrel.

- [ ] **Step 2: Run the moved tests to verify RED**

Run:

```bash
npm test -w api -- tests/rag
```

Expected: FAIL because `apps/api/src/infrastructure/rag/**` does not exist.

---

### Task 2: Move RAG Production Modules and Rewire API Consumers

**Files:**
- Create: `apps/api/src/infrastructure/rag/chunking/chunk-documents.ts`
- Create: `apps/api/src/infrastructure/rag/documents/rulebook-document.ts`
- Create: `apps/api/src/infrastructure/rag/embeddings/embed-text.ts`
- Create: `apps/api/src/infrastructure/rag/loaders/pdf-loader.ts`
- Create: `apps/api/src/infrastructure/rag/vector-store/index.ts`
- Create: `apps/api/src/infrastructure/rag/vector-store/langchain-memory-vector-store.ts`
- Create: `apps/api/src/infrastructure/rag/vector-store/vector-store.ts`
- Modify: `apps/api/src/main.ts`
- Modify: `apps/api/src/application/ingestion/ingestion-service.ts`
- Modify: `apps/api/src/application/ingestion/ingestion-types.ts`
- Modify: `apps/api/src/application/retrieval/retrieval-service.ts`
- Modify: `apps/api/src/infrastructure/database/persistence.ts`
- Modify: `apps/api/src/infrastructure/database/vector/langchain-pg-vector-store.ts`
- Modify: `apps/api/src/infrastructure/persistence/create-persistence.ts`
- Modify: `apps/api/tests/ingestion-service.test.ts`
- Modify: `apps/api/tests/retrieval-service.test.ts`
- Modify: `apps/api/tests/database/langchain-pg-vector-store.test.ts`

**Interfaces:**
- Consumes: LangChain document, embedding, text-splitting, and vector-store APIs
- Produces: unchanged `chunkDocuments`, `RulebookDocument`, `createOpenAIEmbeddings`, `loadPdfDocuments`, `parsePdfDocuments`, `LangchainMemoryVectorStore`, and `VectorStore` APIs

- [ ] **Step 1: Move the production modules without behavior changes**

Retain the existing module contents and internal ESM imports. For example:

```ts
// apps/api/src/infrastructure/rag/vector-store/vector-store.ts
import type { Callbacks } from "@langchain/core/callbacks/manager";
import type {
  RulebookDocument,
  RulebookDocumentInterface,
} from "../documents/rulebook-document.js";

export type VectorStoreFilter = (document: RulebookDocument) => boolean;

export type VectorStoreSimilaritySearchInput = {
  callbacks?: Callbacks;
  filter?: VectorStoreFilter;
  query: string;
  topK?: number;
};

export interface VectorStore {
  upsert(records: RulebookDocument[]): Promise<void>;
  similaritySearch(
    input: VectorStoreSimilaritySearchInput,
  ): Promise<RulebookDocumentInterface[]>;
  similaritySearchVectorWithScore(
    input: VectorStoreSimilaritySearchInput,
  ): Promise<[RulebookDocumentInterface, number][]>;
}
```

- [ ] **Step 2: Replace API package imports with focused local imports**

Use the following mapping:

```text
createOpenAIEmbeddings -> infrastructure/rag/embeddings/embed-text
chunkDocuments -> infrastructure/rag/chunking/chunk-documents
loadPdfDocuments -> infrastructure/rag/loaders/pdf-loader
RulebookDocument and metadata types -> infrastructure/rag/documents/rulebook-document
VectorStore types -> infrastructure/rag/vector-store/vector-store
LangchainMemoryVectorStore -> infrastructure/rag/vector-store/langchain-memory-vector-store
```

Update the ingestion test mock to mock the local loader module used by
`ingestion-service.ts`, preserving its partial mock behavior.

- [ ] **Step 3: Run the RAG and affected API tests to verify GREEN**

Run:

```bash
npm test -w api -- tests/rag tests/ingestion-service.test.ts tests/retrieval-service.test.ts tests/database/langchain-pg-vector-store.test.ts
```

Expected: all selected test files pass.

- [ ] **Step 4: Commit the working RAG move**

```bash
git add apps/api/src/infrastructure/rag apps/api/tests/rag apps/api/src apps/api/tests
git commit -m "refactor(api): move rag infrastructure into api"
```

---

### Task 3: Move Agent Tests and Establish RED

**Files:**
- Create: `apps/api/tests/agents/agent-error.test.ts`
- Create: `apps/api/tests/agents/agent-runtime.test.ts`
- Create: `apps/api/tests/agents/conversation-title-agent.test.ts`
- Create: `apps/api/tests/agents/llm-service.test.ts`
- Create: `apps/api/tests/agents/prompts.test.ts`
- Create: `apps/api/tests/agents/rule-agents.test.ts`

**Interfaces:**
- Consumes: existing test behavior from `apps/packages/agent-core/tests/**`
- Produces: tests importing API-local modules under `src/infrastructure/agents`

- [ ] **Step 1: Copy the agent tests into the API test project**

Preserve all cases and assertions. Replace package-relative source imports with
the matching local paths, including:

```ts
import { AgentError } from "../../src/infrastructure/agents/agents/agent-error";
import { ConversationTitleAgent } from "../../src/infrastructure/agents/agents/conversation-title-agent";
import { LLMService } from "../../src/infrastructure/agents/llm/llm-service";
```

- [ ] **Step 2: Run the moved tests to verify RED**

Run:

```bash
npm test -w api -- tests/agents
```

Expected: FAIL because `apps/api/src/infrastructure/agents/**` does not exist.

---

### Task 4: Move Agent Production Modules and Rewire API Consumers

**Files:**
- Create: `apps/api/src/infrastructure/agents/agents/agent-error.ts`
- Create: `apps/api/src/infrastructure/agents/agents/agent.ts`
- Create: `apps/api/src/infrastructure/agents/agents/conversation-title-agent.ts`
- Create: `apps/api/src/infrastructure/agents/agents/rule-answer-agent.ts`
- Create: `apps/api/src/infrastructure/agents/agents/rule-context-agent.ts`
- Create: `apps/api/src/infrastructure/agents/context-origin.ts`
- Create: `apps/api/src/infrastructure/agents/llm/llm-service.ts`
- Create: `apps/api/src/infrastructure/agents/prompts/board-game-rule-master-prompt.ts`
- Create: `apps/api/src/infrastructure/agents/prompts/conversation-title-prompt.ts`
- Create: `apps/api/src/infrastructure/agents/prompts/rule-context-prompt.ts`
- Modify: `apps/api/src/main.ts`
- Modify: `apps/api/src/application/retrieval/retrieval-service.ts`
- Modify: `apps/api/src/application/retrieval/retrieval-types.ts`
- Modify: `apps/api/src/presentation/http/retrieval/retrieval-schema.ts`
- Modify: `apps/api/tests/retrieval-service.test.ts`

**Interfaces:**
- Consumes: LangChain chat models, prompts, agents, and message types
- Produces: unchanged agent classes, `LLMService`, prompt templates, `CONTEXT_ORIGIN`, `CONTEXT_ORIGINS`, and `ContextOrigin`

- [ ] **Step 1: Move the agent modules without behavior changes**

Keep all current class APIs, prompts, validation, error wrapping, defaults, and
console logging unchanged. Preserve `.js` suffixes for internal production ESM
imports.

- [ ] **Step 2: Replace API package imports with focused local imports**

Use the following mapping:

```text
ConversationTitleAgent -> infrastructure/agents/agents/conversation-title-agent
RuleAnswerAgent -> infrastructure/agents/agents/rule-answer-agent
RuleContextAgent -> infrastructure/agents/agents/rule-context-agent
LLMService -> infrastructure/agents/llm/llm-service
CONTEXT_ORIGIN, CONTEXT_ORIGINS, ContextOrigin -> infrastructure/agents/context-origin
```

- [ ] **Step 3: Run the agent and affected retrieval tests to verify GREEN**

Run:

```bash
npm test -w api -- tests/agents tests/retrieval-service.test.ts tests/retrieval-schema.test.ts
```

Expected: all selected test files pass.

- [ ] **Step 4: Commit the working agent move**

```bash
git add apps/api/src/infrastructure/agents apps/api/tests/agents apps/api/src apps/api/tests
git commit -m "refactor(api): move agent infrastructure into api"
```

---

### Task 5: Transfer Dependencies and Remove Workspace Packages

**Files:**
- Modify: `apps/api/package.json`
- Modify: `package-lock.json`
- Delete: `apps/packages/rag-core/**`
- Delete: `apps/packages/agent-core/**`

**Interfaces:**
- Consumes: external packages formerly declared by the two internal packages
- Produces: one API workspace with no `rag-core` or `agent-core` package dependency

- [ ] **Step 1: Update API dependencies**

Remove:

```json
"@board-game-rules-assistant/agent-core": "^0.1.0",
"@board-game-rules-assistant/rag-core": "^0.1.0"
```

Add the exact compatible dependency ranges already used by the packages:

```json
"@langchain/classic": "^1.0.38",
"@langchain/core": "^1.2.2",
"@langchain/langgraph": "^1.4.7",
"@langchain/openai": "^1.5.3",
"@langchain/textsplitters": "^1.0.1",
"langchain": "^1.5.3",
"pdfjs-dist": "^6.1.200"
```

- [ ] **Step 2: Delete both obsolete package directories**

Delete all source, tests, READMEs, package manifests, TypeScript configs, and
Vitest configs under `apps/packages/rag-core` and `apps/packages/agent-core`.

- [ ] **Step 3: Refresh the workspace lockfile**

Run:

```bash
npm install
```

Expected: the two workspace links disappear and no new dependency versions are
introduced beyond the transferred compatible declarations.

- [ ] **Step 4: Confirm package references are gone from current code**

Run:

```bash
rg '@board-game-rules-assistant/(rag-core|agent-core)' apps package.json package-lock.json
```

Expected: no matches.

---

### Task 6: Update Current Documentation and Container Commands

**Files:**
- Modify: `apps/api/README.md`
- Modify: `README.md`
- Modify: `docker-compose.yml`

**Interfaces:**
- Consumes: final consolidated source layout and commands
- Produces: accurate current documentation and container startup commands

- [ ] **Step 1: Remove package build steps from Docker Compose**

In both API container commands, remove:

```text
npm run build -w @board-game-rules-assistant/rag-core
npm run build -w @board-game-rules-assistant/agent-core
```

Retain the API build/start sequence and web startup behavior.

- [ ] **Step 2: Update repository and API documentation**

Document `src/infrastructure/rag` and `src/infrastructure/agents` in the API
layout. Remove workspace-package commands and package-tree entries from the root
README. Change API prose that says processing happens "through rag-core" to say
it happens through API-owned RAG infrastructure.

- [ ] **Step 3: Validate Docker Compose configuration**

Run:

```bash
docker compose config --quiet
```

Expected: exit code 0.

---

### Task 7: Format, Verify, Commit, and Smoke Test

**Files:**
- Verify all changed files

**Interfaces:**
- Consumes: completed consolidation
- Produces: committed, tested `master` with the API stopped

- [ ] **Step 1: Run the repository formatter**

Run:

```bash
npm run format
```

Expected: exit code 0. Revert unrelated formatter-only changes before commit.

- [ ] **Step 2: Run verification sequentially**

Run:

```bash
TEST_DATABASE_URL=postgresql://board_game_rules:board_game_rules@127.0.0.1:55432/board_game_rules npm test
npm run typecheck
npm run build
npm run lint -w api
docker compose config --quiet
git diff --check
```

Expected: every command exits 0; all tests pass; the API and web production
builds succeed.

- [ ] **Step 3: Verify removal and review scope**

Run:

```bash
rg '@board-game-rules-assistant/(rag-core|agent-core)|apps/packages/(rag-core|agent-core)' apps package.json package-lock.json docker-compose.yml README.md
git status --short
git diff --stat
```

Expected: no obsolete current references; only consolidation files are changed.

- [ ] **Step 4: Commit the cleanup**

```bash
git add apps/api apps/packages README.md docker-compose.yml package-lock.json
git commit -m "refactor: consolidate rag and agents into api"
```

- [ ] **Step 5: Run fresh post-commit tests**

Run:

```bash
TEST_DATABASE_URL=postgresql://board_game_rules:board_game_rules@127.0.0.1:55432/board_game_rules npm test
```

Expected: all test files and tests pass.

- [ ] **Step 6: Smoke-test the built API and stop it**

Start `apps/api/dist/main.js` with `NODE_ENV=local PORT=8000`, request
`http://127.0.0.1:8000/health`, and expect:

```json
{"status":"ok","service":"board-game-rules-assistant-api"}
```

Stop the process, confirm `lsof -ti tcp:8000` prints nothing, and confirm
`git status --short` is empty.
