# ContextOS Backend (Module 1 + Module 3)

Authentication/User Management service with embedded Ingestion Module (Data Integrations).

## Tech Stack

- Node.js + Express.js
- MongoDB + Mongoose
- Passport.js (Google OAuth2 + GitHub OAuth2)
- JWT access (15m) + refresh (7d) tokens in httpOnly cookies
- Zod validation
- Nodemailer for email verification and password reset
- express-rate-limit for auth route protection
- KafkaJS for publishing normalized ingestion events
- node-cron for 15-minute polling jobs
- AES-256-GCM encryption for stored integration credentials

## File Structure

```text
Backend/
  .env.example
  package.json
  README.md
  src/
    app.js
    server.js
    config/
      db.js
      env.js
      passport.js
    controllers/
      auth.controller.js
      oauth.controller.js
      organisation.controller.js
    middleware/
      auth.middleware.js
      error.middleware.js
      rateLimit.middleware.js
      rbac.middleware.js
      validate.middleware.js
    models/
      PasswordResetToken.js
      RefreshToken.js
      User.js
      VerificationToken.js
    ingestion/
      config/
        kafka.js
      controllers/
        credential.controller.js
        webhook.controller.js
      jobs/
        pollScheduler.js
      middleware/
        requestContext.middleware.js
        webhookTrust.middleware.js
      models/
        IntegrationCredential.js
      normalizers/
        eventNormalizer.js
      providers/
        confluence.provider.js
        github.provider.js
        jira.provider.js
        providerHttpClient.js
        slack.provider.js
      publishers/
        kafkaPublisher.js
      routes/
        credential.routes.js
        webhook.routes.js
      services/
        encryption.service.js
        eventIngestion.service.js
        integrationCredential.service.js
        polling.service.js
        retry.service.js
      utils/
        ipAllowlist.js
      validators/
        credential.schemas.js
    routes/
      auth.routes.js
      index.js
      oauth.routes.js
      organisation.routes.js
    utils/
      appError.js
      asyncHandler.js
      cookie.js
      hash.js
      mailer.js
      token.js
    validators/
      auth.schemas.js
```

## Routes

Base prefix: `/api/v1/auth`

- `POST /register` - Register user with bcrypt-hashed password (12 rounds)
- `POST /login` - Login, issue access + refresh cookies
- `POST /refresh` - Rotate refresh token and issue new cookie pair
- `POST /logout` - Revoke refresh token and clear cookies
- `GET /me` - Get current authenticated user (requires access token)
- `GET /verify-email/:token` - Verify email via time-limited token
- `POST /resend-verification` - Resend verification email
- `POST /forgot-password` - Send password reset email (time-limited token)
- `POST /reset-password` - Reset password and revoke active sessions

OAuth routes:

- `GET /api/v1/auth/oauth/google`
- `GET /api/v1/auth/oauth/google/callback`
- `GET /api/v1/auth/oauth/github`
- `GET /api/v1/auth/oauth/github/callback`

Module 3 ingestion routes:

- `POST /api/v1/webhooks/github`
- `POST /api/v1/webhooks/jira`
- `POST /api/v1/webhooks/slack`
- `GET /api/v1/credentials`
- `GET /api/v1/credentials/:provider`
- `PUT /api/v1/credentials/:provider`
- `DELETE /api/v1/credentials/:provider`

Ingestion event schema published to Kafka topic `events.ingestion`:

- `{ org_id, source, event_type, content, metadata, timestamp }`

Webhook trust model (layered):

- Shared-secret signature verification (GitHub/Jira/Slack)
- Source IP allowlists (CIDR supported)

## RBAC

Supported roles:

- `owner`
- `admin`
- `member`
- `viewer`

Middleware:

- `requireAuth` validates JWT access token from bearer or cookie
- `requireRole(...roles)` enforces role hierarchy

## Run Locally

1. Copy `.env.example` to `.env` and fill all values.
2. Install dependencies:
   - `npm install`
3. Run service:
   - `npm run dev`

Embedded ingestion env tips:

- Set `INGESTION_ENABLED=true` to keep ingestion routes and scheduler enabled.
- Set `MOCK_KAFKA=true` for local runs without Kafka.
- Use `WEBHOOK_BASE_URL` as the public callback base (for example ngrok URL + `/api/v1/webhooks`).

Module 3 environment variables:

- `KAFKA_BROKERS` (comma-separated)
- `KAFKA_CLIENT_ID`
- `KAFKA_TOPIC`
- `MOCK_KAFKA`
- `ENCRYPTION_KEY` (64-char hex key for AES-256-GCM)
- `GITHUB_WEBHOOK_SECRET`
- `JIRA_WEBHOOK_SECRET`
- `SLACK_SIGNING_SECRET`
- `GITHUB_WEBHOOK_IP_ALLOWLIST` (comma-separated CIDR/IP)
- `JIRA_WEBHOOK_IP_ALLOWLIST` (comma-separated CIDR/IP)
- `SLACK_WEBHOOK_IP_ALLOWLIST` (comma-separated CIDR/IP)
- `POLL_CRON` (default every 15 minutes)
- `POLL_LOOKBACK_MINUTES`
- `RETRY_MAX_RETRIES`
- `RETRY_BASE_DELAY_MS`
- `RETRY_MAX_DELAY_MS`
- `GITHUB_API_BASE_URL`
- `JIRA_API_BASE_URL`
- `SLACK_API_BASE_URL`
- `CONFLUENCE_API_BASE_URL`

Health check:

- `GET /health`

Health response includes `ingestion` runtime status:

- `enabled`
- `kafkaConnected`
- `schedulerStarted`
- `startupError`
- `updatedAt`
