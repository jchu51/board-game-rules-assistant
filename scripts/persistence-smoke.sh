#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD_DIR="$ROOT_DIR/.superpowers/sdd/task-9-build/api"
export DATABASE_URL="${DATABASE_URL:-postgres://board_game_rules:board_game_rules@localhost:5432/board_game_rules}"

cd "$ROOT_DIR"
docker compose up -d --wait postgres

# Build the database package so migration and test execution do not depend on tsx/esbuild.
npm run build -w @board-game-rules-assistant/database
node apps/packages/database/dist/postgres/migrate.js

case "$BUILD_DIR" in
  "$ROOT_DIR"/.superpowers/sdd/task-9-build/api) rm -rf -- "$BUILD_DIR" ;;
  *) echo "Refusing to clear unexpected build directory: $BUILD_DIR" >&2; exit 1 ;;
esac
mkdir -p "$BUILD_DIR"
npx tsc -p apps/api/tsconfig.test.json --noEmit false --outDir "$BUILD_DIR"
LC_ALL=C find "$BUILD_DIR" -name '*.js' -exec perl -pi -e 's/(from "\.[^"]*?)(?<!\.js)"/$1.js"/g' {} +
node --test "$BUILD_DIR/tests/persistence-smoke.test.js"

echo "Persistence smoke test passed. PostgreSQL remains running for inspection."
