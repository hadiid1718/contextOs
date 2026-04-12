# API Gateway (Module 8)

Stackmind API Gateway is the single entry point for frontend and client traffic.

## Features

- JWT verification on protected routes.
- Proxy routing to auth, ingestion, graph, query, notification, and billing services.
- Per-organisation sliding-window rate limit (1000 requests/minute) with Redis.
- `X-Correlation-ID` propagation for distributed tracing.
- JSON request logs via morgan + winston.
- `GET /health` endpoint with liveness and readiness checks.

## Route Map

- `/api/v1/auth` -> auth service (public)
- `/api/v1/webhooks` -> ingestion service webhooks (public)
- `/api/v1/credentials` -> ingestion service (JWT + rate limit)
- `/api/v1/graph` -> graph service (JWT + rate limit)
- `/api/v1/query` -> query service (JWT + rate limit; rewritten to `/api/v1/ai`)
- `/api/v1/ai` -> query service alias (JWT + rate limit)
- `/api/v1/notifications` -> notification service (JWT + rate limit)
- `/api/v1/billing` -> billing service (JWT + rate limit)

## Health Probes

- Liveness: `GET /health?probe=liveness`
- Readiness: `GET /health` or `GET /health?probe=readiness`

Readiness checks ping `<service>/health` for each upstream.

## Required Environment Variables

- `GATEWAY_PORT` (default: `4000`)
- `GATEWAY_CORS_ORIGIN` (default: `APP_ORIGIN`)
- `GATEWAY_RATE_LIMIT_PER_MINUTE` (default: `1000`)
- `GATEWAY_RATE_LIMIT_WINDOW_MS` (default: `60000`)
- `GATEWAY_RATE_LIMIT_PREFIX` (default: `gateway:rate`)
- `GATEWAY_UPSTREAM_TIMEOUT_MS` (default: `2000`)
- `AUTH_SERVICE_URL`
- `INGESTION_SERVICE_URL`
- `GRAPH_SERVICE_URL`
- `QUERY_SERVICE_URL`
- `NOTIFICATION_SERVICE_URL`
- `BILLING_SERVICE_URL`
- `REDIS_URL`

## Local Smoke Check

Run:

```bash
npm run gateway:smoke
```
