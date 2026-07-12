# Vitest Coverage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a workspace-wide Vitest coverage report and keep lines, statements, functions, and branches at or above 80%.

**Architecture:** The root Vitest project remains the single test orchestrator. It will use Vitest's V8 provider to aggregate the four existing projects, emit machine- and human-readable reports, and apply global thresholds; uncovered executable behavior will be covered with focused tests in the owning workspace.

**Tech Stack:** Vitest 4.1.10, `@vitest/coverage-v8` 4.1.10, TypeScript, React Testing Library, jsdom, npm workspaces.

## Global Constraints

- Measure the API, web app, agent-core package, and rag-core package through the root Vitest configuration.
- Require at least 80% for lines, statements, functions, and branches.
- Emit `text`, `html`, `json`, and `lcov` reports under `coverage/`.
- Keep generated coverage artifacts out of Git.
- Add tests for observable behavior; do not exclude legitimate source files merely to raise percentages.

---

### Task 1: Configure Workspace Coverage

**Files:**

- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `vitest.config.ts`
- Create: `.gitignore`

**Interfaces:**

- Consumes: the existing `test.projects` root Vitest configuration.
- Produces: `npm run test:coverage`, which runs all projects and writes reports to `coverage/`.

- [ ] **Step 1: Verify the provider is absent**

Run: `npm ls @vitest/coverage-v8`

Expected: a non-zero exit or an empty dependency tree.

- [ ] **Step 2: Install the matching coverage provider**

Run: `npm install --save-dev @vitest/coverage-v8@4.1.10`

Expected: `package.json` and `package-lock.json` record version `4.1.10` at the root.

- [ ] **Step 3: Add the coverage command and configuration**

Add this root script:

```json
"test:coverage": "vitest run --coverage"
```

Add this block beside `projects` in `vitest.config.ts`:

```ts
coverage: {
  provider: "v8",
  reporter: ["text", "html", "json", "lcov"],
  thresholds: {
    lines: 80,
    statements: 80,
    functions: 80,
    branches: 80,
  },
},
```

Create the root `.gitignore` with:

```gitignore
coverage/
```

- [ ] **Step 4: Format the configuration**

Run: `npx prettier --write package.json vitest.config.ts .gitignore`

Expected: Prettier exits zero.

- [ ] **Step 5: Commit coverage configuration**

```bash
git add package.json package-lock.json vitest.config.ts .gitignore
git commit -m "test: configure Vitest coverage"
```

### Task 2: Establish and Analyze the Coverage Baseline

**Files:**

- Read: `coverage/coverage-final.json`
- Read: terminal coverage table

**Interfaces:**

- Consumes: `npm run test:coverage` from Task 1.
- Produces: a ranked list of uncovered files and exact lines/branches to test.

- [ ] **Step 1: Run the baseline report**

Run: `npm run test:coverage`

Expected: every test project runs; the command may fail only because one or more 80% thresholds are unmet.

- [ ] **Step 2: Rank real coverage gaps**

Use the terminal table and `coverage/coverage-final.json` to select executable files with the largest uncovered line and branch counts. Ignore type-only modules, entry-point re-exports, and generated declarations only when V8 reports no executable statements for them.

- [ ] **Step 3: Record the baseline metrics**

Record the four aggregate percentages in the implementation notes or commit message so the final run can be compared against the baseline.

### Task 3: Add Focused Tests Until Every Metric Exceeds 80%

**Files:**

- Modify or create tests under the owning project: `apps/api/tests/**/*.test.ts`, `apps/packages/agent-core/tests/**/*.test.ts`, `apps/packages/rag-core/tests/**/*.test.ts`, or `apps/web/src/**/*.test.{ts,tsx}`.
- Read only: corresponding source files reported as uncovered.

**Interfaces:**

- Consumes: uncovered files and exact branches from Task 2.
- Produces: behavioral regression tests that execute the reported success, failure, and conditional paths.

- [ ] **Step 1: Write one failing focused test for the highest-impact uncovered behavior**

Use the existing project test style: import `describe`, `expect`, `it`, and `vi` explicitly; exercise the public function/component/service; assert returned values, rendered output, state changes, or dependency calls. Do not assert coverage counters or private implementation details.

- [ ] **Step 2: Verify the focused test fails for the expected assertion**

Run the owning project's test command with the exact test file, for example:

```bash
npx vitest run --project web apps/web/src/components/rulebook-upload/dropzone.test.tsx
```

Expected: the new assertion fails because the behavior or fixture is not yet represented correctly, not because of a syntax or environment error.

- [ ] **Step 3: Complete the fixture and assertions without changing production behavior**

Add only the mocks, user interaction, input data, or expected result needed to exercise the reported source path. If the test reveals a production defect, stop and diagnose it separately before changing runtime code.

- [ ] **Step 4: Verify the focused test passes**

Run the same exact-file command from Step 2.

Expected: the selected test file passes with clean stderr.

- [ ] **Step 5: Re-run aggregate coverage**

Run: `npm run test:coverage`

Expected: the selected file's uncovered counts decrease. Repeat Steps 1–5 against the next highest-impact real behavior until lines, statements, functions, and branches all exceed 80%.

- [ ] **Step 6: Commit each coherent test group**

```bash
git add -- '*.test.ts' '*.test.tsx'
git commit -m "test: raise Vitest coverage"
```

### Task 4: Final Verification

**Files:**

- Verify: all files changed by Tasks 1 and 3.

**Interfaces:**

- Consumes: configured coverage command and new tests.
- Produces: reproducible evidence that tests, coverage, types, and formatting pass.

- [ ] **Step 1: Run the coverage gate**

Run: `npm run test:coverage`

Expected: exit zero with lines, statements, functions, and branches each greater than or equal to 80%.

- [ ] **Step 2: Run type checking**

Run: `npm run typecheck`

Expected: exit zero in every workspace that defines a typecheck script.

- [ ] **Step 3: Format changed files**

Run: `npm run format`

Expected: Prettier exits zero; review formatter changes and retain only task-related formatting.

- [ ] **Step 4: Re-run coverage after formatting**

Run: `npm run test:coverage`

Expected: exit zero with all tests passing and every configured metric at or above 80%.

- [ ] **Step 5: Confirm generated artifacts are ignored**

Run: `git status --short --ignored coverage`

Expected: `coverage/` appears only as ignored output and no generated report is staged.
