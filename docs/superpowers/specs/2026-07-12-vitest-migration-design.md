# Vitest Migration Design

## Goal

Replace the monorepo's Node.js test-runner setup with Vitest, migrate every existing test to Vitest assertions and mocks, and prepare the React workspace for component tests with React Testing Library.

## Scope

The migration covers four npm workspaces:

- `apps/api`
- `apps/packages/agent-core`
- `apps/packages/rag-core`
- `apps/web`

All 15 existing `*.test.ts` files in the API and shared packages will be converted. The web workspace currently has no tests, so the migration will add one accessible component smoke test that proves the jsdom and React Testing Library setup works.

Coverage reporting, browser-mode testing, end-to-end testing, and production-code refactoring are outside this migration.

## Architecture

The repository root will own the Vitest dependency and orchestration configuration. A root `vitest.config.ts` will use Vitest's `test.projects` option to discover one project configuration in each workspace. This follows the current Vitest monorepo model and avoids the deprecated standalone workspace configuration.

Each workspace will own a small `vitest.config.ts` so it can select its execution environment and run independently:

- API, agent-core, and rag-core use the `node` environment.
- Web merges its test configuration with the existing Vite configuration and uses `jsdom`.

Project names will be unique (`api`, `agent-core`, `rag-core`, and `web`) so root commands can report and filter results unambiguously.

## Dependencies

The root workspace will add `vitest` as a development dependency.

The web workspace will add:

- `@testing-library/dom`
- `@testing-library/jest-dom`
- `@testing-library/react`
- `jsdom`

No Jest compatibility package will be added. Vitest's native `expect` and `vi` APIs will replace Node assertions and mocks directly.

## Test Migration

Every test file will explicitly import the Vitest APIs it uses. Global test APIs will remain disabled.

Assertion mappings will use the closest semantic Vitest matcher:

- `assert.equal(actual, expected)` becomes `expect(actual).toBe(expected)`.
- `assert.deepEqual(actual, expected)` becomes `expect(actual).toEqual(expected)`.
- `assert.match(actual, pattern)` becomes `expect(actual).toMatch(pattern)`.
- `assert.ok(value)` becomes a specific matcher such as `toBeDefined`, `toBeTruthy`, or a numeric comparison.
- `assert.rejects` becomes `await expect(promise).rejects` with `toThrow` or `toMatchObject`.

`node:test` spies created with `mock.method` will become `vi.spyOn(...).mockImplementation(...)`. Tests will restore each spy explicitly or through `afterEach` where a shared cleanup is appropriate.

Production behavior and test intent will remain unchanged. The migration will not rewrite test fixtures or replace existing fakes with broader mocking.

## React Test Setup

The web project will use a setup file that:

- imports `@testing-library/jest-dom/vitest` to register DOM matchers;
- imports `afterEach` from Vitest;
- calls React Testing Library's `cleanup` after each test.

The initial React test will render an existing UI component and query it through an accessible role or label. It will verify user-visible behavior rather than implementation details.

## Commands

The root package will expose:

- `npm test` to run every Vitest project once with `vitest run`;
- `npm run test:watch` to run all projects in watch mode with `vitest`.

Each workspace will expose matching `test` and `test:watch` commands scoped to its local project configuration. Existing `typecheck` scripts remain separate because Vitest does not replace TypeScript compilation checks.

## Error Handling and Compatibility

The Vitest configuration will use repository-relative paths and explicit include patterns so tests do not depend on the caller's working directory. Node projects will only include their existing `tests/**/*.test.ts` files. The web project will include `src/**/*.test.{ts,tsx}`.

The migration targets the repository's existing Node 22 and Vite 8 toolchain, which satisfies current Vitest requirements. Any module-resolution difference exposed by Vitest will be fixed in test configuration or test imports without changing runtime module contracts.

## Verification

The migration is complete when:

1. No test imports `node:test` or `node:assert`.
2. `npm test` at the repository root runs all four Vitest projects once and passes.
3. Each workspace's `npm test` command runs independently and passes, including the web component test.
4. `npm run typecheck` at the repository root passes.
5. Formatting passes with the repository's configured formatter.
6. A repository search finds no remaining Node test-runner commands in package scripts or test files.

