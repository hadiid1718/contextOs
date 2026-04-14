#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd -- "${SCRIPT_DIR}/.." && pwd)"
COMPOSE_FILE="${PROJECT_ROOT}/docker-compose.dev.yaml"

usage() {
  cat <<'EOF'
Usage: ./scripts/dev.sh [command] [extra-args]

Commands:
  up            Build and run development stack (foreground)
  upd           Build and run development stack (detached)
  down          Stop and remove development containers
  restart       Recreate development stack in detached mode
  logs [svc]    Tail logs for all services or one service
  ps            Show development stack status
  health        Call app health endpoint
  mongo         Open mongosh in mongodb container

Examples:
  ./scripts/dev.sh up
  ./scripts/dev.sh upd
  ./scripts/dev.sh logs app
EOF
}

require_docker() {
  if ! command -v docker >/dev/null 2>&1 && ! command -v docker-compose >/dev/null 2>&1; then
    echo "Error: Docker is not installed."
    exit 1
  fi

  if command -v docker >/dev/null 2>&1 && ! docker info >/dev/null 2>&1; then
    echo "Error: Docker daemon is not running."
    exit 1
  fi
}

resolve_compose() {
  if docker compose version >/dev/null 2>&1; then
    DOCKER_COMPOSE=(docker compose)
  elif command -v docker-compose >/dev/null 2>&1; then
    DOCKER_COMPOSE=(docker-compose)
  else
    echo "Error: docker compose is not available."
    exit 1
  fi
}

run_compose() {
  "${DOCKER_COMPOSE[@]}" -f "${COMPOSE_FILE}" "$@"
}

require_docker
resolve_compose

COMMAND="${1:-up}"
if [[ $# -gt 0 ]]; then
  shift
fi

case "${COMMAND}" in
  up)
    run_compose up --build "$@"
    ;;
  upd)
    run_compose up --build -d "$@"
    ;;
  down)
    run_compose down "$@"
    ;;
  restart)
    run_compose down --remove-orphans
    run_compose up --build -d "$@"
    ;;
  logs)
    run_compose logs -f "$@"
    ;;
  ps)
    run_compose ps "$@"
    ;;
  health)
    if ! command -v curl >/dev/null 2>&1; then
      echo "Error: curl is required for health checks."
      exit 1
    fi
    curl -fsS "http://localhost:4001/health"
    echo
    ;;
  mongo)
    run_compose exec mongodb mongosh "$@"
    ;;
  *)
    usage
    exit 1
    ;;
esac
