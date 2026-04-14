#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd -- "${SCRIPT_DIR}/.." && pwd)"
COMPOSE_FILE="${PROJECT_ROOT}/docker-compose.prod.yaml"
ENV_FILE="${PROJECT_ROOT}/.env.production"

usage() {
  cat <<'EOF'
Usage: ./scripts/prod.sh [command] [extra-args]

Commands:
  up              Build and run production stack (detached)
  down            Stop and remove production containers
  restart         Recreate production stack in detached mode
  logs [svc]      Tail logs for all services or one service
  ps              Show production stack status
  health          Call app health endpoint
  build-image     Build image with CI-aligned tags (local build)
  push-image      Build and push multi-platform image (requires DOCKER_USERNAME)

Environment:
  DATABASE_URL must be provided via shell env or .env.production.
  DOCKER_USERNAME is required for push-image.

Examples:
  DATABASE_URL='mongodb+srv://...' ./scripts/prod.sh up
  ./scripts/prod.sh logs app
  DOCKER_USERNAME=myuser ./scripts/prod.sh push-image
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

load_database_url_from_env_file() {
  if [[ -n "${DATABASE_URL:-}" ]]; then
    return
  fi

  if [[ ! -f "${ENV_FILE}" ]]; then
    return
  fi

  local raw_line
  raw_line="$(grep -E '^[[:space:]]*DATABASE_URL=' "${ENV_FILE}" | tail -n 1 || true)"
  if [[ -z "${raw_line}" ]]; then
    return
  fi

  local value="${raw_line#*=}"
  value="${value%$'\r'}"
  value="${value%\"}"
  value="${value#\"}"
  value="${value%\'}"
  value="${value#\'}"

  if [[ -n "${value}" ]]; then
    export DATABASE_URL="${value}"
  fi
}

require_database_url() {
  load_database_url_from_env_file

  if [[ -z "${DATABASE_URL:-}" ]]; then
    echo "Error: DATABASE_URL is required for production compose."
    echo "Set it in your shell or add DATABASE_URL to ${ENV_FILE}."
    exit 1
  fi
}

ci_tags() {
  local branch short_sha timestamp
  branch="$(git -C "${PROJECT_ROOT}" rev-parse --abbrev-ref HEAD 2>/dev/null || echo local)"
  branch="${branch//\//-}"
  short_sha="$(git -C "${PROJECT_ROOT}" rev-parse --short HEAD 2>/dev/null || echo local)"
  timestamp="$(date +'%y%m%d-%H%M%S')"

  echo "${branch}" "sha-${short_sha}" "prod-${timestamp}"
}

build_image() {
  local repository branch_tag sha_tag prod_tag
  read -r branch_tag sha_tag prod_tag < <(ci_tags)

  if [[ -n "${DOCKER_USERNAME:-}" ]]; then
    repository="${DOCKER_USERNAME}/stackmind-backend"
  else
    repository="stackmind-backend"
  fi

  local tags=(
    -t "${repository}:${branch_tag}"
    -t "${repository}:${sha_tag}"
    -t "${repository}:${prod_tag}"
  )

  if [[ "${branch_tag}" == "main" ]]; then
    tags+=( -t "${repository}:latest" )
  fi

  docker build -f "${PROJECT_ROOT}/Dockerfile" "${tags[@]}" "${PROJECT_ROOT}"

  echo "Built image tags:"
  printf ' - %s:%s\n' "${repository}" "${branch_tag}"
  printf ' - %s:%s\n' "${repository}" "${sha_tag}"
  printf ' - %s:%s\n' "${repository}" "${prod_tag}"
  if [[ "${branch_tag}" == "main" ]]; then
    printf ' - %s:%s\n' "${repository}" "latest"
  fi
}

push_image() {
  if [[ -z "${DOCKER_USERNAME:-}" ]]; then
    echo "Error: DOCKER_USERNAME is required for push-image."
    exit 1
  fi

  if ! docker buildx version >/dev/null 2>&1; then
    echo "Error: docker buildx is required for push-image."
    exit 1
  fi

  local repository branch_tag sha_tag prod_tag
  repository="${DOCKER_USERNAME}/stackmind-backend"
  read -r branch_tag sha_tag prod_tag < <(ci_tags)

  local tags=(
    -t "${repository}:${branch_tag}"
    -t "${repository}:${sha_tag}"
    -t "${repository}:${prod_tag}"
  )

  if [[ "${branch_tag}" == "main" ]]; then
    tags+=( -t "${repository}:latest" )
  fi

  docker buildx build \
    --platform linux/amd64,linux/arm64 \
    --push \
    -f "${PROJECT_ROOT}/Dockerfile" \
    "${tags[@]}" \
    "${PROJECT_ROOT}"

  echo "Pushed image tags:"
  printf ' - %s:%s\n' "${repository}" "${branch_tag}"
  printf ' - %s:%s\n' "${repository}" "${sha_tag}"
  printf ' - %s:%s\n' "${repository}" "${prod_tag}"
  if [[ "${branch_tag}" == "main" ]]; then
    printf ' - %s:%s\n' "${repository}" "latest"
  fi
}

require_docker
resolve_compose

COMMAND="${1:-up}"
if [[ $# -gt 0 ]]; then
  shift
fi

case "${COMMAND}" in
  up)
    require_database_url
    run_compose up --build -d "$@"
    ;;
  down)
    run_compose down "$@"
    ;;
  restart)
    require_database_url
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
  build-image)
    build_image
    ;;
  push-image)
    push_image
    ;;
  *)
    usage
    exit 1
    ;;
esac
