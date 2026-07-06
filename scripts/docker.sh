#!/usr/bin/env sh
set -eu

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

cd "$ROOT_DIR"

case "${1:-up}" in
  up)
    docker compose up --build
    ;;
  down)
    docker compose down
    ;;
  build)
    docker compose build
    ;;
  logs)
    docker compose logs -f
    ;;
  restart)
    docker compose down
    docker compose up --build
    ;;
  *)
    echo "Usage: scripts/docker.sh [up|down|build|logs|restart]"
    exit 1
    ;;
esac
