# ContextOS: Backend & Ingestion Service Integration Guide

Complete guide to integrate the **Backend Auth Service** with the **Ingestion Service** for multi-source event ingestion (GitHub, Jira, Slack, Confluence).

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [How It Works](#how-it-works)
3. [Credential Flow](#credential-flow)
4. [Kafka Event Publishing](#kafka-event-publishing)
5. [API Contracts](#api-contracts)
6. [Environment Setup](#environment-setup)
7. [Local Testing with ngrok](#local-testing-with-ngrok)
8. [Example Payloads](#example-payloads)
9. [Troubleshooting](#troubleshooting)

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           External Services                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐           │
│  │ GitHub   │  │  Jira    │  │  Slack   │  │Confluence  │           │
│  └──────────┘  └──────────┘  └──────────┘  └────────────┘           │
│         │             │             │             │                  │
│         └─────────────┼─────────────┼─────────────┘                  │
│                       │             │ (Webhooks + Polling)           │
│                       ▼             ▼                                │
│      ┌────────────────────────────────┐                             │
│      │   INGESTION SERVICE (4010)     │                             │
│      │  ┌─────────────────────────┐   │                             │
│      │  │  Webhook Receivers      │   │                             │
│      │  │  - GitHub /webhooks/... │   │                             │
│      │  │  - Jira /webhooks/...   │   │                             │
│      │  │  - Slack /webhooks/...  │   │                             │
│      │  └─────────────────────────┘   │                             │
│      │  ┌─────────────────────────┐   │                             │
│      │  │  Polling Scheduler      │   │                             │
│      │  │  (every 15 minutes)     │   │                             │
│      │  └─────────────────────────┘   │                             │
│      │  ┌─────────────────────────┐   │                             │
│      │  │  Normalizer Service     │   │                             │
│      │  │  { org_id, source, ... }│   │                             │
│      │  └─────────────────────────┘   │                             │
│      └────────────────────────────────┘                             │
│               │                  │                                  │
│               ├─► MongoDB (ingestion-credentials)                  │
│               │   [encrypted OAuth tokens]                          │
│               │                                                     │
│               └─► Kafka (events.ingestion topic)                   │
│                   [normalized event stream]                         │
└─────────────────────────────────────────────────────────────────────┘
           │                                     │
           │ (Backend context/org_id)           │ (Subscribe to events)
           │                                     │
┌──────────▼──────────────────────────────────────────────────────────┐
│                      BACKEND SERVICE (4001)                         │
│  ┌──────────────────────────────────────────────────────────┐       │
│  │  /api/v1/auth         (user auth, JWT tokens)           │       │
│  │  /api/v1/organisations (org management)                 │       │
│  │  /api/v1/auth/oauth/* (GitHub/Google OAuth)            │       │
│  └──────────────────────────────────────────────────────────┘       │
│  ┌──────────────────────────────────────────────────────────┐       │
│  │  MongoDB (contextos-auth)                               │       │
│  │  - Users, Organisations, Memberships                    │       │
│  │  - RefreshTokens, PasswordResetTokens                   │       │
│  └──────────────────────────────────────────────────────────┘       │
└───────────────────────────────────────────────────────────────────────┘
```

---

## How It Works

### 1. **Webhooks (Real-time)**
GitHub, Jira, Slack send HTTP POST events → Ingestion webhook receivers:
- Signature verification (HMAC, timestamp checks)
- IP allowlist validation
- Normalize payload to canonical schema
- Publish to Kafka topic `events.ingestion`

### 2. **Polling (Scheduled)**
Every 15 minutes (configurable cron):
- Fetch stored encrypted OAuth credentials from MongoDB
- Call GitHub/Jira/Slack/Confluence APIs
- Normalize results
- Publish to Kafka topic `events.ingestion`

### 3. **Backend Integration Points**
- Backend stores `org_id` in request headers or context
- Backend can register webhook URLs with external providers
- Backend subscribes to `events.ingestion` Kafka topic for real-time ingestion updates
- Backend queries Backend's org context to enrich events

---

## Credential Flow

### Store OAuth Token (Backend → Ingestion)

**Endpoint:** `POST /api/v1/credentials`

**Request:**
```json
{
  "org_id": "org-uuid-123",
  "source": "github",
  "token": {
    "accessToken": "github_pat_xxx",
    "refreshToken": "optional",
    "expiresAt": "2026-04-09T12:00:00Z"
  }
}
```

**Response:**
```json
{
  "saved": true
}
```

**Security:** Token is encrypted with AES-256-GCM before storage.

### Retrieve OAuth Token (Ingestion Internal)

**During polling:**
1. Ingestion decrypts stored credential
2. Uses token to authenticate with provider API
3. If token expired, refresh (if refresh token exists)
4. Re-encrypt and store new token

---

## Kafka Event Publishing

### Event Schema (Normalized)

All events published to `events.ingestion` follow this schema:

```json
{
  "org_id": "org-uuid-123",
  "source": "github",
  "event_type": "push",
  "content": "feat: add ingestion service",
  "metadata": {
    "repository": "contextos/platform",
    "branch": "main",
    "author": "alice@contextos.io",
    "commitHash": "abc123"
  },
  "timestamp": "2026-04-09T10:30:00Z"
}
```

### Example Events

#### GitHub Push Event
```json
{
  "org_id": "org-uuid-123",
  "source": "github",
  "event_type": "push",
  "content": "feat: add webhook handler",
  "metadata": {
    "repository": "contextos/repo",
    "sender": "alice",
    "action": null,
    "deliveryId": "12345-abcde"
  },
  "timestamp": "2026-04-09T10:30:00Z"
}
```

#### Jira Issue Created
```json
{
  "org_id": "org-uuid-123",
  "source": "jira",
  "event_type": "jira:issue_created",
  "content": "PROJ-101: Implement OAuth storage",
  "metadata": {
    "issueKey": "PROJ-101",
    "projectKey": "PROJ",
    "user": "jira-user-abc"
  },
  "timestamp": "2026-04-09T10:30:00Z"
}
```

#### Slack Message
```json
{
  "org_id": "org-uuid-123",
  "source": "slack",
  "event_type": "message",
  "content": "Ingestion service is live!",
  "metadata": {
    "channel": "C123456",
    "user": "U789012",
    "team": "T111111",
    "eventId": "Ev222222"
  },
  "timestamp": "2026-04-09T10:30:00Z"
}
```

#### Confluence Page Updated (Polled)
```json
{
  "org_id": "org-uuid-123",
  "source": "confluence",
  "event_type": "confluence:page_polled",
  "content": "Architecture Documentation",
  "metadata": {
    "id": "12345",
    "type": "page",
    "lastUpdatedBy": "bob@contextos.io"
  },
  "timestamp": "2026-04-09T10:30:00Z"
}
```

### Backend Kafka Consumer Example

```javascript
import { Kafka } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'contextos-backend',
  brokers: ['127.0.0.1:9092'],
});

const consumer = kafka.consumer({ groupId: 'backend-events-group' });

await consumer.subscribe({ topic: 'events.ingestion', fromBeginning: false });

await consumer.run({
  eachMessage: async ({ topic, partition, message }) => {
    const event = JSON.parse(message.value.toString());

    console.log(`Received ${event.source} event for org ${event.org_id}:`, event.event_type);

    // Process event based on org_id and source
    if (event.source === 'github' && event.event_type === 'push') {
      // Handle GitHub push
    }
  },
});
```

---

## API Contracts

### Ingestion Webhook Endpoints

All webhook endpoints expect `x-org-id` header or query parameter.

#### GitHub Webhook
- **URL:** `POST /api/v1/webhooks/github`
- **Headers:**
  - `x-github-event`: event type (push, pull_request, issues)
  - `x-github-signature-256`: HMAC-SHA256 signature
  - `x-github-delivery`: delivery ID
- **Body:** GitHub webhook payload (JSON)
- **Response:** `202 Accepted`

#### Jira Webhook
- **URL:** `POST /api/v1/webhooks/jira`
- **Headers:**
  - `x-atlassian-webhook-signature`: Base64 signature
  - `x-org-id`: organization ID
- **Body:** Jira webhook payload (JSON)
- **Response:** `202 Accepted`

#### Slack Webhook
- **URL:** `POST /api/v1/webhooks/slack`
- **Headers:**
  - `x-slack-request-timestamp`: timestamp
  - `x-slack-signature`: signature v0=...
  - `x-org-id`: organization ID
- **Body:** Slack event payload (JSON)
- **Response:** `202 Accepted` or `200 OK` (for URL verification challenge)

### Credential Endpoints

#### Save Credential
- **URL:** `POST /api/v1/credentials`
- **Body:**
  ```json
  {
    "org_id": "string",
    "source": "github|jira|slack|confluence",
    "token": {
      "accessToken": "string",
      "refreshToken": "string (optional)",
      "expiresAt": "ISO8601 timestamp (optional)"
    }
  }
  ```
- **Response:** `201 Created` → `{ "saved": true }`

#### Get Credential
- **URL:** `GET /api/v1/credentials?org_id=<id>&source=<source>`
- **Response:** `200 OK` → `{ "org_id": "...", "source": "...", "token": {...} }`
- **Response:** `404 Not Found` if no credential stored

#### Health Check
- **URL:** `GET /api/v1/health`
- **Response:** `200 OK` → `{ "status": "ok" }`

---

## Environment Setup

### Backend Service

**File:** `Backend/.env.development` (already configured)

Key additions for Ingestion integration:

```dotenv
NODE_ENV=development
PORT=4001
MONGO_URI=mongodb://127.0.0.1:27017/contextos-auth
JWT_ACCESS_SECRET=your-secret
JWT_REFRESH_SECRET=your-secret
ORG_INVITATION_SECRET=your-secret

# Kafka consumer (Backend subscribes to Ingestion events)
KAFKA_BROKERS=127.0.0.1:9092
KAFKA_INGESTION_TOPIC=events.ingestion
KAFKA_CONSUMER_GROUP=contextos-backend-events
```

### Ingestion Service

**File:** `Ingestion/.env` (copy from `.env.example`)

```dotenv
NODE_ENV=development
PORT=4010

# MongoDB (separate instance for Ingestion credentials)
MONGO_URI=mongodb://127.0.0.1:27017/contextos-ingestion

# Kafka publishing
KAFKA_BROKERS=127.0.0.1:9092
KAFKA_CLIENT_ID=contextos-ingestion-service
KAFKA_TOPIC=events.ingestion
MOCK_KAFKA=false

# Encryption for OAuth tokens
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

# Webhook secrets (get from GitHub/Jira/Slack)
GITHUB_WEBHOOK_SECRET=your-github-secret
JIRA_WEBHOOK_SECRET=your-jira-secret
SLACK_SIGNING_SECRET=your-slack-signing-secret

# Webhook base URL (set to ngrok URL for local testing)
WEBHOOK_BASE_URL=https://your-ngrok-subdomain.ngrok-free.app/api/v1/webhooks

# IP allowlists (optional, comma-separated)
GITHUB_WEBHOOK_IP_ALLOWLIST=
JIRA_WEBHOOK_IP_ALLOWLIST=
SLACK_WEBHOOK_IP_ALLOWLIST=

# Polling schedule
POLL_CRON="*/15 * * * *"
POLL_LOOKBACK_MINUTES=15

# API base URLs
GITHUB_API_BASE_URL=https://api.github.com
JIRA_API_BASE_URL=https://your-domain.atlassian.net
SLACK_API_BASE_URL=https://slack.com/api
CONFLUENCE_API_BASE_URL=https://your-domain.atlassian.net/wiki/rest/api
```

---

## Local Testing with ngrok

### Step 1: Start MongoDB and Kafka (Local)

```bash
# Option A: Using Docker (recommended)
docker run -d -p 27017:27017 mongo:latest
docker run -d -p 9092:9092 -e KAFKA_ADVERTISED_LISTENERS=PLAINTEXT://127.0.0.1:9092 confluentinc/cp-kafka:latest

# Option B: Using local installations (manual)
mongod
kafka-server-start.sh $KAFKA_HOME/config/server.properties
```

### Step 2: Start Backend Service

```bash
cd Backend
npm install
npm run dev
# Running on http://localhost:4001
```

### Step 3: Start Ingestion Service

```bash
cd Ingestion
npm install
cp .env.example .env
# Edit .env to set MOCK_KAFKA=false if Kafka is running, or true for mock mode
npm run dev
# Running on http://localhost:4010
```

### Step 4: Setup ngrok Tunnel

```powershell
# Install ngrok from https://ngrok.com/download
ngrok http 4010

# Output:
# Session Status: online
# Web Interface: http://127.0.0.1:4040
# Forwarding: https://abc123.ngrok-free.app -> http://localhost:4010

# Copy the HTTPS forwarding URL
```

### Step 5: Configure Webhook Base URL

Edit `Ingestion/.env`:

```dotenv
WEBHOOK_BASE_URL=https://abc123.ngrok-free.app/api/v1/webhooks
```

### Step 6: Register Webhooks with GitHub

1. Go to your GitHub repository → Settings → Webhooks → Add webhook
2. **Payload URL:** `https://abc123.ngrok-free.app/api/v1/webhooks/github`
3. **Content type:** `application/json`
4. **Secret:** Set your `GITHUB_WEBHOOK_SECRET` in the GitHub UI
5. **Events:** Select `Push events`, `Pull request events`, `Issues`
6. **Active:** ✓ Checked

### Step 7: Store GitHub OAuth Token

```bash
curl -X POST http://localhost:4010/api/v1/credentials \
  -H "Content-Type: application/json" \
  -H "x-org-id: org-123" \
  -d '{
    "org_id": "org-123",
    "source": "github",
    "token": {
      "accessToken": "github_pat_your_token_here",
      "expiresAt": "2026-12-31T23:59:59Z"
    }
  }'
```

### Step 8: Test Webhook Delivery

Push a commit to your GitHub repository:

```bash
echo "# Test" >> README.md
git add README.md
git commit -m "test: trigger webhook"
git push
```

### Step 9: Verify Event in Kafka

```bash
# If MOCK_KAFKA=false, check Kafka messages:
kafka-console-consumer.sh --bootstrap-server 127.0.0.1:9092 --topic events.ingestion --from-beginning

# Expected output:
# {"org_id":"org-123","source":"github","event_type":"push",...}
```

### Step 10: Check ngrok Dashboard

Visit `http://127.0.0.1:4040` to see all webhook requests made through ngrok tunnel.

---

## Example Payloads

### Incoming: GitHub Push Webhook

```json
{
  "ref": "refs/heads/main",
  "before": "000000",
  "after": "abc123def456",
  "repository": {
    "id": 123456,
    "name": "repo",
    "full_name": "contextos/repo",
    "private": false
  },
  "pusher": {
    "name": "alice",
    "email": "alice@contextos.io"
  },
  "sender": {
    "login": "alice",
    "id": 12345
  },
  "head_commit": {
    "id": "abc123def456",
    "message": "feat: add ingestion service",
    "author": {
      "name": "alice",
      "email": "alice@contextos.io"
    }
  }
}
```

**Normalized Output (to Kafka):**
```json
{
  "org_id": "org-123",
  "source": "github",
  "event_type": "push",
  "content": "feat: add ingestion service",
  "metadata": {
    "repository": "contextos/repo",
    "sender": "alice",
    "action": null,
    "deliveryId": "12345-abcde"
  },
  "timestamp": "2026-04-09T10:30:00Z"
}
```

### Incoming: Jira Issue Webhook

```json
{
  "webhookEvent": "jira:issue_created",
  "user": {
    "self": "https://your-domain.atlassian.net/rest/api/3/user?accountId=abc123",
    "accountId": "abc123",
    "displayName": "Bob Smith"
  },
  "issue": {
    "expand": "changelog,versionedRepresentations",
    "id": "10000",
    "self": "https://your-domain.atlassian.net/rest/api/3/issue/10000",
    "key": "PROJ-101",
    "fields": {
      "summary": "Implement OAuth credential storage",
      "description": "Store encrypted OAuth tokens in MongoDB",
      "project": {
        "self": "https://your-domain.atlassian.net/rest/api/3/project/PROJ",
        "id": "10000",
        "key": "PROJ",
        "name": "ContextOS"
      }
    }
  }
}
```

**Normalized Output (to Kafka):**
```json
{
  "org_id": "org-123",
  "source": "jira",
  "event_type": "jira:issue_created",
  "content": "Implement OAuth credential storage",
  "metadata": {
    "issueKey": "PROJ-101",
    "projectKey": "PROJ",
    "user": "abc123"
  },
  "timestamp": "2026-04-09T10:30:00Z"
}
```

---

## Troubleshooting

### Issue: Webhook returns `404`

**Solution:**
- Check your webhook URL includes the full path: `/api/v1/webhooks/github` (not just `/api/v1/webhooks`)
- Ensure Ingestion service is running: `npm run dev`
- Verify ngrok tunnel is active: `ngrok http 4010`
- Check ngrok dashboard for actual requests: `http://127.0.0.1:4040`

### Issue: Webhook returns `401 Unauthorized`

**Solution:**
- GitHub/Jira/Slack signature verification failed
- Check your webhook secret matches the one in `.env`
- Verify header names are correct (case-sensitive):
  - GitHub: `x-hub-signature-256`
  - Jira: `x-atlassian-webhook-signature`
  - Slack: `x-slack-signature` + `x-slack-request-timestamp`

### Issue: Kafka messages not appearing

**Solution:**
- Check if `MOCK_KAFKA=true` (mock mode, no actual Kafka publish)
- Verify Kafka is running: `docker ps | grep kafka`
- Check Kafka broker address in `.env`: `KAFKA_BROKERS=127.0.0.1:9092`
- Consume with correct topic: `kafka-console-consumer.sh --bootstrap-server 127.0.0.1:9092 --topic events.ingestion --from-beginning`

### Issue: Credential encryption fails

**Solution:**
- Check `ENCRYPTION_KEY` is exactly 32 bytes (hex or base64)
- If in hex: `0123456789abcdef...` (64 hex chars = 32 bytes)
- If in base64: encode a 32-byte key: `openssl rand -base64 32`

### Issue: Polling not running

**Solution:**
- Check `POLL_CRON` value: `*/15 * * * *` (every 15 minutes)
- Check logs for: `Poll scheduler started with cron: ...`
- Verify credentials exist in MongoDB for at least one org: `db.oauthcredentials.find()`
- Check polling logs in console every 15 minutes

---

## Summary: Data Flow

```
1. External Event (GitHub/Jira/Slack/Confluence)
   ↓
2. Ingestion receives webhook or polls API
   ↓
3. Verify signature + IP allowlist
   ↓
4. Normalize payload to canonical schema
   ↓
5. Publish to Kafka topic (events.ingestion)
   ↓
6. Backend subscribes + processes events
   ↓
7. Backend updates org context, user activities, etc.
```

---

## Next Steps

1. **Deploy both services** (Backend + Ingestion) in same environment
2. **Configure webhook secrets** with actual values from GitHub/Jira/Slack
3. **Setup real Kafka broker** in production environment
4. **Implement Backend Kafka consumer** to subscribe to `events.ingestion`
5. **Add event enrichment logic** in Backend to correlate events with users/orgs
6. **Setup monitoring/alerting** on webhook delivery failures and polling errors

---

## References

- [Backend README](./Backend/README.md)
- [Ingestion README](./Ingestion/README.md)
- [Ingestion Webhook Routes](./Ingestion/src/routes/webhook.routes.js)
- [Ingestion Normalizer Service](./Ingestion/src/services/normalizer.service.js)
- [Ingestion Polling Scheduler](./Ingestion/src/jobs/pollScheduler.js)

