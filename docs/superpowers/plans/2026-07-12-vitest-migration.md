# Vitest Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the monorepo's Node.js test runner with Vitest, migrate all 15 existing tests, and add a verified React Testing Library setup for the web workspace.

**Architecture:** A root `vitest.config.ts` orchestrates four uniquely named project configs. API and shared-package tests run in Node; web tests merge the existing Vite plugins and aliases with a jsdom setup that registers Testing Library cleanup and DOM matchers.

**Tech Stack:** Node.js 22, npm workspaces, TypeScript 6, Vitest 4.1.10, jsdom 29.1.1, React Testing Library 16.3.2, DOM Testing Library 10.4.1, jest-dom 6.9.1.

## Global Constraints

- Use Vitest's current `test.projects` configuration; do not add a deprecated `vitest.workspace` file.
- Keep explicit imports from `vitest`; do not enable global test APIs.
- Preserve production behavior and the intent of every existing test.
- Keep type checking in the existing `typecheck` scripts; test scripts run Vitest only.
- Do not add coverage, browser-mode, or end-to-end tooling.
- Every project name must be unique: `api`, `agent-core`, `rag-core`, and `web`.
- The root `npm test` command must run all four projects once; `npm run test:watch` must watch all four.

---

## File Structure

- `vitest.config.ts`: root project orchestration only.
- `apps/api/vitest.config.ts`: API Node test discovery.
- `apps/packages/agent-core/vitest.config.ts`: agent-core Node test discovery.
- `apps/packages/rag-core/vitest.config.ts`: rag-core Node test discovery.
- `apps/web/vitest.config.ts`: Vite-aware web project using jsdom.
- `apps/web/src/test/setup.ts`: jest-dom registration and automatic React cleanup.
- `apps/web/src/components/ui/button.test.tsx`: minimal accessible component proof.
- Existing `tests/*.test.ts`: migrated assertions, suites, and spies without behavior changes.

### Task 1: Add Vitest Projects and Prove the Web Harness

**Files:**

- Create: `vitest.config.ts`
- Create: `apps/api/vitest.config.ts`
- Create: `apps/packages/agent-core/vitest.config.ts`
- Create: `apps/packages/rag-core/vitest.config.ts`
- Create: `apps/web/vitest.config.ts`
- Create: `apps/web/src/test/setup.ts`
- Create: `apps/web/src/components/ui/button.test.tsx`
- Modify: `package.json`
- Modify: `apps/api/package.json`
- Modify: `apps/packages/agent-core/package.json`
- Modify: `apps/packages/rag-core/package.json`
- Modify: `apps/web/package.json`
- Modify: `package-lock.json`

**Interfaces:**

- Consumes: the existing Vite configuration and `Button` component.
- Produces: root and workspace `test`/`test:watch` commands plus four named Vitest projects.

- [ ] **Step 1: Add the failing React component test**

Create `apps/web/src/components/ui/button.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Button } from "./button";

describe("Button", () => {
  it("renders an accessible button label", () => {
    render(<Button>Upload rulebook</Button>);

    expect(
      screen.getByRole("button", { name: "Upload rulebook" }),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Verify the new test cannot run before setup**

Run:

```bash
npm test -w web
```

Expected: FAIL because the web workspace does not have a `test` script or installed test harness yet.

- [ ] **Step 3: Install exact test dependencies**

Run:

```bash
npm install --save-dev --save-exact vitest@4.1.10
npm install --workspace web --save-dev --save-exact @testing-library/dom@10.4.1 @testing-library/jest-dom@6.9.1 @testing-library/react@16.3.2 jsdom@29.1.1
```

Expected: root and web manifests plus `package-lock.json` record the exact versions.

- [ ] **Step 4: Create the root project configuration**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      "./apps/api/vitest.config.ts",
      "./apps/packages/agent-core/vitest.config.ts",
      "./apps/packages/rag-core/vitest.config.ts",
      "./apps/web/vitest.config.ts",
    ],
  },
});
```

- [ ] **Step 5: Create the three Node project configurations**

Create `apps/api/vitest.config.ts`:

```ts
import { defineProject } from "vitest/config";

export default defineProject({
  test: {
    name: "api",
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
```

Create `apps/packages/agent-core/vitest.config.ts` with the same content except `name: "agent-core"`. Create `apps/packages/rag-core/vitest.config.ts` with the same content except `name: "rag-core"`.

- [ ] **Step 6: Create the web project and setup files**

Create `apps/web/vitest.config.ts`:

```ts
import { defineProject, mergeConfig } from "vitest/config";

import viteConfig from "./vite.config";

export default mergeConfig(
  viteConfig,
  defineProject({
    test: {
      name: "web",
      environment: "jsdom",
      include: ["src/**/*.test.{ts,tsx}"],
      setupFiles: ["./src/test/setup.ts"],
    },
  }),
);
```

Create `apps/web/src/test/setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});
```

- [ ] **Step 7: Replace test scripts**

In the root `package.json`, add:

```json
"test": "vitest run",
"test:watch": "vitest"
```

In each of `apps/api/package.json`, `apps/packages/agent-core/package.json`, `apps/packages/rag-core/package.json`, and `apps/web/package.json`, use:

```json
"test": "vitest run",
"test:watch": "vitest"
```

Remove the old `tsc --noEmit ... && node --import tsx --test ...` test commands. Keep all existing `typecheck` commands unchanged.

- [ ] **Step 8: Verify the web project passes independently**

Run:

```bash
npm test -w web
```

Expected: one passing `Button` test in project `web`.

- [ ] **Step 9: Verify unmigrated Node tests fail under Vitest**

Run:

```bash
npm test -w api -- tests/config-schema.test.ts
```

Expected: FAIL because the file still registers suites with `node:test` instead of Vitest.

- [ ] **Step 10: Commit the test harness**

```bash
git add package.json package-lock.json vitest.config.ts apps/api/package.json apps/api/vitest.config.ts apps/packages/agent-core/package.json apps/packages/agent-core/vitest.config.ts apps/packages/rag-core/package.json apps/packages/rag-core/vitest.config.ts apps/web/package.json apps/web/vitest.config.ts apps/web/src/test/setup.ts apps/web/src/components/ui/button.test.tsx
git commit -m "test: configure Vitest workspaces"
```

### Task 2: Migrate API Schema, Repository, and Middleware Tests

**Files:**

- Modify: `apps/api/tests/config-schema.test.ts`
- Modify: `apps/api/tests/conversation-repository.test.ts`
- Modify: `apps/api/tests/error-middleware.test.ts`
- Modify: `apps/api/tests/ingestion-schema.test.ts`
- Modify: `apps/api/tests/retrieval-schema.test.ts`
- Modify: `apps/api/tests/rulebook-repository.test.ts`

**Interfaces:**

- Consumes: project `api` from Task 1.
- Produces: six API test files registered and asserted entirely through Vitest.

- [ ] **Step 1: Record the failing Vitest baseline**

Run:

```bash
npm test -w api -- tests/config-schema.test.ts tests/conversation-repository.test.ts tests/error-middleware.test.ts tests/ingestion-schema.test.ts tests/retrieval-schema.test.ts tests/rulebook-repository.test.ts
```

Expected: FAIL because the selected files use `node:test`.

- [ ] **Step 2: Convert imports and value assertions**

For the six files, remove:

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
```

Use this import in files without spies:

```ts
import { describe, expect, it } from "vitest";
```

Apply these exact mappings throughout the selected files:

```ts
assert.equal(actual, expected);
// becomes
expect(actual).toBe(expected);

assert.deepEqual(actual, expected);
// becomes
expect(actual).toEqual(expected);

assert.match(actual, pattern);
// becomes
expect(actual).toMatch(pattern);
```

Do not reorder fixtures or change expected values.

- [ ] **Step 3: Convert middleware spies**

In `error-middleware.test.ts`, import:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
```

Add after the helper functions:

```ts
afterEach(() => {
  vi.restoreAllMocks();
});
```

Replace each `mock.method(console, "error", () => {})` plus `try/finally` restoration with:

```ts
vi.spyOn(console, "error").mockImplementation(() => {});
```

Call the middleware directly after creating the spy. The shared `afterEach` restores it.

- [ ] **Step 4: Run the migrated API subset**

Run the command from Step 1 again.

Expected: all selected suites pass under project `api`.

- [ ] **Step 5: Commit the foundational API migration**

```bash
git add apps/api/tests/config-schema.test.ts apps/api/tests/conversation-repository.test.ts apps/api/tests/error-middleware.test.ts apps/api/tests/ingestion-schema.test.ts apps/api/tests/retrieval-schema.test.ts apps/api/tests/rulebook-repository.test.ts
git commit -m "test: migrate API foundation tests to Vitest"
```

### Task 3: Migrate API Service Tests

**Files:**

- Modify: `apps/api/tests/request-classifier-service.test.ts`
- Modify: `apps/api/tests/retrieval-service.test.ts`
- Modify: `apps/api/tests/tavily-public-search-service.test.ts`

**Interfaces:**

- Consumes: project `api` and assertion conventions from Tasks 1-2.
- Produces: the remaining API tests running exclusively through Vitest.

- [ ] **Step 1: Record the failing service-test baseline**

Run:

```bash
npm test -w api -- tests/request-classifier-service.test.ts tests/retrieval-service.test.ts tests/tavily-public-search-service.test.ts
```

Expected: FAIL because the selected files still use `node:test`.

- [ ] **Step 2: Convert suite imports and synchronous assertions**

Replace the Node imports in all three files with:

```ts
import { describe, expect, it } from "vitest";
```

Apply the same `toBe`, `toEqual`, and `toMatch` mappings from Task 2. Preserve every query, fixture, expected match, and agent result in `retrieval-service.test.ts`.

- [ ] **Step 3: Convert promise rejection assertions**

In `tavily-public-search-service.test.ts`, replace:

```ts
await assert.rejects(
  service.search({ query: "Catan longest road" }),
  /Tavily failed/,
);
```

with:

```ts
await expect(
  service.search({ query: "Catan longest road" }),
).rejects.toThrow("Tavily failed");
```

- [ ] **Step 4: Run all API tests**

Run:

```bash
npm test -w api
```

Expected: all nine API test files pass and Vitest reports no unhandled errors.

- [ ] **Step 5: Commit the API service migration**

```bash
git add apps/api/tests/request-classifier-service.test.ts apps/api/tests/retrieval-service.test.ts apps/api/tests/tavily-public-search-service.test.ts
git commit -m "test: migrate API service tests to Vitest"
```

### Task 4: Migrate Agent-Core Tests

**Files:**

- Modify: `apps/packages/agent-core/tests/agent-error.test.ts`
- Modify: `apps/packages/agent-core/tests/prompts.test.ts`
- Modify: `apps/packages/agent-core/tests/rule-agents.test.ts`

**Interfaces:**

- Consumes: project `agent-core` from Task 1.
- Produces: all agent-core tests using Vitest assertions and spies.

- [ ] **Step 1: Record the failing agent-core baseline**

Run:

```bash
npm test -w @board-game-rules-assistant/agent-core
```

Expected: FAIL because the three files use `node:test`.

- [ ] **Step 2: Convert simple agent and prompt assertions**

Replace Node imports in `agent-error.test.ts` and `prompts.test.ts` with:

```ts
import { describe, expect, it } from "vitest";
```

Convert `assert.equal` to `toBe` and `assert.match` to `toMatch`. Preserve the exact prompt fragments and message counts.

- [ ] **Step 3: Convert rule-agent spies and errors**

In `rule-agents.test.ts`, import:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
```

Add:

```ts
afterEach(() => {
  vi.restoreAllMocks();
});
```

Replace `mock.method(console, "error", () => {})` with:

```ts
vi.spyOn(console, "error").mockImplementation(() => {});
```

Replace the custom `assert.rejects` callback with two Vitest assertions over the same rejected promise:

```ts
const run = agent.run("question");

await expect(run).rejects.toBeInstanceOf(AgentError);
await expect(run).rejects.toMatchObject({
  name: "AgentError",
  agentName: "rule-context-agent",
  cause,
});
```

Convert all remaining equality and regex assertions without changing runtime fakes.

- [ ] **Step 4: Run agent-core tests**

Run:

```bash
npm test -w @board-game-rules-assistant/agent-core
```

Expected: all three files pass with the console spy restored after each test.

- [ ] **Step 5: Commit the agent-core migration**

```bash
git add apps/packages/agent-core/tests/agent-error.test.ts apps/packages/agent-core/tests/prompts.test.ts apps/packages/agent-core/tests/rule-agents.test.ts
git commit -m "test: migrate agent-core tests to Vitest"
```

### Task 5: Migrate RAG-Core Tests

**Files:**

- Modify: `apps/packages/rag-core/tests/chunk-documents.test.ts`
- Modify: `apps/packages/rag-core/tests/embed-text.test.ts`
- Modify: `apps/packages/rag-core/tests/langchain-memory-vector-store.test.ts`

**Interfaces:**

- Consumes: project `rag-core` from Task 1.
- Produces: all rag-core tests using Vitest assertions.

- [ ] **Step 1: Record the failing rag-core baseline**

Run:

```bash
npm test -w @board-game-rules-assistant/rag-core
```

Expected: FAIL because the three files use `node:test`.

- [ ] **Step 2: Convert imports and standard assertions**

Replace Node imports in all three files with:

```ts
import { describe, expect, it } from "vitest";
```

Use `toBe`, `toEqual`, and `toMatch` for direct equivalents. Replace:

```ts
assert.ok(chunks.length > 1);
```

with:

```ts
expect(chunks.length).toBeGreaterThan(1);
```

- [ ] **Step 3: Preserve vector-score checks without Node assertion narrowing**

In `langchain-memory-vector-store.test.ts`, replace the score assertions with:

```ts
const [bestMatch, weakestMatch] = results;

expect(bestMatch).toBeDefined();
expect(weakestMatch).toBeDefined();
expect(bestMatch?.[0].metadata.documentId).toBe("catan");
expect(bestMatch?.[1]).toBeGreaterThan(0.99);
expect(bestMatch![1]).toBeGreaterThan(weakestMatch![1]);
```

This preserves the original checks while avoiding reliance on `assert.ok` for TypeScript narrowing.

- [ ] **Step 4: Run rag-core tests**

Run:

```bash
npm test -w @board-game-rules-assistant/rag-core
```

Expected: all three files pass.

- [ ] **Step 5: Commit the rag-core migration**

```bash
git add apps/packages/rag-core/tests/chunk-documents.test.ts apps/packages/rag-core/tests/embed-text.test.ts apps/packages/rag-core/tests/langchain-memory-vector-store.test.ts
git commit -m "test: migrate rag-core tests to Vitest"
```

### Task 6: Verify the Complete Migration

**Files:**

- Inspect: all modified test and configuration files
- Modify only if verification identifies a migration defect.

**Interfaces:**

- Consumes: all four Vitest projects and migrated test suites.
- Produces: evidence that the root runner, workspace runners, type checking, and formatting all pass.

- [ ] **Step 1: Confirm Node test-runner references are gone**

Run:

```bash
rg -n 'node:test|node:assert|node --import tsx --test|mock\.method' package.json apps --glob 'package.json' --glob '*.{ts,tsx}'
```

Expected: no matches.

- [ ] **Step 2: Run every workspace through the root project runner**

Run:

```bash
npm test
```

Expected: projects `api`, `agent-core`, `rag-core`, and `web` all pass; 16 test files total run once.

- [ ] **Step 3: Verify each workspace command independently**

Run:

```bash
npm test -w api
npm test -w @board-game-rules-assistant/agent-core
npm test -w @board-game-rules-assistant/rag-core
npm test -w web
```

Expected: every command passes and only runs its own project tests.

- [ ] **Step 4: Run repository type checking**

Run:

```bash
npm run typecheck
```

Expected: all workspace TypeScript checks pass.

- [ ] **Step 5: Run formatting and re-run the full suite**

Run:

```bash
npm run format
npm test
```

Expected: formatting completes and all 16 test files remain green.

- [ ] **Step 6: Review the final diff and commit verification fixes if needed**

Run:

```bash
git diff --check
git status --short
```

Expected: no whitespace errors; only intentional migration files are present.

If formatting or verification changed tracked files, commit them:

```bash
git add package.json package-lock.json vitest.config.ts apps
git commit -m "test: complete Vitest migration"
```
