# agent-core

Reusable agent primitives for the Board Game Rules Assistant.

This package keeps prompt templates, model initialization, and LangChain-backed
agent wrappers separate from the Express API. The API can compose these
primitives later without making the package depend on HTTP request/response
types.

## Exports

```ts
import {
  LLMService,
  RuleAnswerAgent,
  RuleContextAgent,
  boardGameRuleMasterPrompt,
} from "@board-game-rules-assistant/agent-core";
```

## What Belongs Here

- Prompt templates used by rules-focused agents
- Agent base classes and shared agent errors
- LangChain-backed agent wrappers
- Chat model initialization helpers

## What Does Not Belong Here

- Express routers
- HTTP request and response types
- Vector-store adapters
- PDF loading or chunking
- Product UI state

## Source Layout

```text
src/
  agents/
    agent.ts
    agent-error.ts
    rule-answer-agent.ts
    rule-context-agent.ts
  llm/
    llm-service.ts
  prompts/
    board-game-rule-master-prompt.ts
    rule-context-prompt.ts
```

## Current Agents

- `RuleContextAgent` takes a user question plus retrieved chunks and filters the
  context down to directly useful rules.
- `RuleAnswerAgent` takes a user question plus curated context and produces a
  grounded rules answer using the board-game rule master prompt.

Both agents accept a LangChain `ConfigurableModel` and create their LangChain
agent once during construction.

## Commands

```bash
npm run build
npm run test
npm run typecheck
```

From the repository root:

```bash
npm run build -w @board-game-rules-assistant/agent-core
npm run test -w @board-game-rules-assistant/agent-core
npm run typecheck -w @board-game-rules-assistant/agent-core
```

## Notes

- This package does not currently expose a search tool. Retrieval lives in the
  API and `rag-core`.
- There is no package-level lint script yet.
- Runtime model provider behavior is not covered by automated tests yet.
