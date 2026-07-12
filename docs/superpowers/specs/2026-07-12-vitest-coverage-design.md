# Vitest Coverage Design

## Goal

Generate one coverage report for the monorepo's Vitest projects and fail the
coverage command when tested source code falls below 80% coverage.

## Scope

Coverage includes the API, web app, agent-core package, and rag-core package
through the existing root Vitest project configuration. The report measures
lines, statements, functions, and branches. Each metric must be at least 80%.

## Configuration

The root workspace will own `@vitest/coverage-v8` at the same version as
Vitest. The root `vitest.config.ts` will enable V8 coverage with:

- `text` output for local and CI feedback;
- `html` output for interactive inspection;
- `json` output for tooling;
- `lcov` output for CI coverage services;
- global 80% thresholds for lines, statements, functions, and branches.

Generated files will live in the default `coverage/` directory and remain
untracked. A root `test:coverage` script will run `vitest run --coverage`.

## Failure Behavior

Test failures continue to fail the command normally. After successful tests,
Vitest also fails the command if any configured coverage metric is below 80%.
The terminal report identifies files and uncovered lines that require tests.

## Verification

The change is complete when:

1. `npm run test:coverage` runs all configured Vitest projects.
2. The command produces text, HTML, JSON, and LCOV reports.
3. All four coverage metrics are at least 80%.
4. The root typecheck and formatter pass.
5. The generated `coverage/` directory is ignored by Git.
