# ContextOS Ingestion Service

Standalone microservice for ingesting GitHub, Jira, Slack, and Confluence events, normalizing them, and publishing to Kafka topic `events.ingestion`.

## Features

- Webhook receivers:
  - GitHub: `push`, `pull_request`, `issues`
  - Jira: `jira:issue_created`, `jira:issue_updated`
  - Slack: message events
- Signature verification + optional IP allowlist checks for webhook endpoints
- Scheduled polling every 15 minutes with `node-cron` (GitHub, Jira, Slack, Confluence)
- Canonical normalized event schema:
  - `{ org_id, source, event_type, content, metadata, timestamp }`
- Kafka publish to topic `events.ingestion` via `kafkajs`
- OAuth credential storage in MongoDB encrypted via AES-256-GCM
- Capped exponential retry with jitter for polling and Kafka publish

## File Structure

```text
Ingestion/
  .env.example
  package.json
  README.md
  src/
    app.js
    server.js
    config/
      db.js
      env.js
      kafka.js
    controllers/
      credential.controller.js
      webhook.controller.js
    integrations/
      confluence.client.js
      github.client.js
      jira.client.js
      slack.client.js
    jobs/
      pollScheduler.js
    middleware/
      error.middleware.js
      ipAllowlist.middleware.js
      requestContext.middleware.js
      signature.middleware.js
    models/
      OAuthCredential.js
    routes/
      credential.routes.js
      index.js
      webhook.routes.js
    services/
      credential.service.js
      crypto.service.js
      ingestion.service.js
      normalizer.service.js
      publisher.service.js
    utils/
      logger.js
      retry.js
  tests/
    ingestion.smoke.test.js
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NODE_ENV` | No | Runtime environment (`development` default). |
| `PORT` | No | HTTP port (`4010` default). |
| `MONGO_URI` | Yes | MongoDB connection URI. |
| `KAFKA_BROKERS` | Yes | Kafka brokers list, comma-separated. |
| `KAFKA_CLIENT_ID` | No | Kafka client ID. |
| `KAFKA_TOPIC` | No | Kafka topic to publish normalized events (`events.ingestion`). |
| `MOCK_KAFKA` | No | `true` skips real Kafka send for local smoke runs. |
| `ENCRYPTION_KEY` | Yes | 32-byte key (hex64 or base64) for AES-256-GCM. |
| `GITHUB_WEBHOOK_SECRET` | No | GitHub webhook HMAC secret. |
| `JIRA_WEBHOOK_SECRET` | No | Jira webhook signature secret. |
| `SLACK_SIGNING_SECRET` | No | Slack signing secret. |
| `WEBHOOK_BASE_URL` | No | Public HTTPS base URL for webhook callbacks (for example, `https://your-public-domain.com/api/v1/webhooks`). |
| `GITHUB_WEBHOOK_IP_ALLOWLIST` | No | Comma-separated allowed IPs. |
| `JIRA_WEBHOOK_IP_ALLOWLIST` | No | Comma-separated allowed IPs. |
| `SLACK_WEBHOOK_IP_ALLOWLIST` | No | Comma-separated allowed IPs. |
| `POLL_CRON` | No | Cron expression for polling (`*/15 * * * *`). |
| `POLL_LOOKBACK_MINUTES` | No | Poll lookback window in minutes (`15`). |
| `GITHUB_API_BASE_URL` | No | GitHub API base URL. |
| `JIRA_API_BASE_URL` | No | Jira API base URL. |
| `SLACK_API_BASE_URL` | No | Slack API base URL. |
| `CONFLUENCE_API_BASE_URL` | No | Confluence API base URL. |

## API Endpoints

- `GET /api/v1/health`
- `POST /api/v1/webhooks/github`
- `POST /api/v1/webhooks/jira`
- `POST /api/v1/webhooks/slack`
- `POST /api/v1/credentials`
- `GET /api/v1/credentials?org_id=<id>&source=<source>`

All webhook routes support trust checks:
- Signature verification
- Optional IP allowlist

## Run

```bash
cd Ingestion
npm install
cp .env.development .env
npm run test
npm run dev
```

### Local webhook testing with ngrok

GitHub, Jira, and Slack need a public HTTPS webhook URL. For local testing:

```powershell
ngrok http 4010
```

Copy the generated HTTPS forwarding URL and set:

```dotenv
WEBHOOK_BASE_URL=https://<your-ngrok-subdomain>.ngrok-free.app/api/v1/webhooks
```

Then configure your webhook providers to use:

- GitHub: `https://<your-ngrok-subdomain>.ngrok-free.app/api/v1/webhooks/github`
- Jira: `https://<your-ngrok-subdomain>.ngrok-free.app/api/v1/webhooks/jira`
- Slack: `https://<your-ngrok-subdomain>.ngrok-free.app/api/v1/webhooks/slack`

## Notes

- For local development without Kafka running, set `MOCK_KAFKA=true`.
- Credential documents store only encrypted token payloads (`iv`, `authTag`, `ciphertext`).
- Polling runs every 15 minutes and publishes normalized events to `events.ingestion`.

