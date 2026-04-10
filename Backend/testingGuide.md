# ContextOS API Testing Guide with HTTPie

This guide walks through the existing backend endpoints step by step using HTTPie.

## Base Setup

Set a base URL and a few reusable values before testing.

```bash
export BASE_URL=http://localhost:4002
export EMAIL=test.user@example.com
export PASSWORD=SecurePass123!
export NAME="Test User"
```

If you are on PowerShell, use:

```powershell
$env:BASE_URL = 'http://localhost:4002'
$env:EMAIL = 'test.user@example.com'
$env:PASSWORD = 'SecurePass123!'
$env:NAME = 'Test User'
```

## 1. Basic Service Checks

### 1.1 Root health response

```bash
http GET $BASE_URL/
```

### 1.2 Health check

```bash
http GET $BASE_URL/health
```

Expected: JSON response with `status`, `service`, `timestamp`, `uptime`, and `ingestion`.

## 2. Authentication Endpoints

### 2.1 Register a user

```bash
http POST $BASE_URL/api/v1/auth/register \
  name="$NAME" \
  email="$EMAIL" \
  password="$PASSWORD"
```

Optional fields:

```bash
http POST $BASE_URL/api/v1/auth/register \
  name="$NAME" \
  email="$EMAIL" \
  password="$PASSWORD" \
  role=member \
  organizationId="org_001"
```

Expected: `201 Created` with a user object and auth cookies.

### 2.2 Verify email

Use the raw verification token from the email body.

```bash
http GET $BASE_URL/api/v1/auth/verify-email/<verification-token>
```

Expected: `200 OK` with `Email verified successfully`.

### 2.3 Resend verification email

```bash
http POST $BASE_URL/api/v1/auth/resend-verification email=$EMAIL
```

Expected: `200 OK` even if the email provider is not configured locally.

### 2.4 Login

```bash
http --session=auth POST $BASE_URL/api/v1/auth/login \
  email=$EMAIL \
  password=$PASSWORD
```

Expected: `200 OK` with a user object and auth cookies stored in the `auth` session.

### 2.5 Refresh token

```bash
http --session=auth POST $BASE_URL/api/v1/auth/refresh
```

Expected: `200 OK` and rotated cookies.

### 2.6 Current user

```bash
http --session=auth GET $BASE_URL/api/v1/auth/me
```

Expected: `200 OK` with the authenticated user profile.

### 2.7 Logout

```bash
http --session=auth POST $BASE_URL/api/v1/auth/logout
```

Expected: `200 OK` and cookies cleared.

### 2.8 Forgot password

```bash
http POST $BASE_URL/api/v1/auth/forgot-password email=$EMAIL
```

Expected: `200 OK` with a generic success message.

### 2.9 Reset password

Use the raw reset token from the password reset email.

```bash
http POST $BASE_URL/api/v1/auth/reset-password \
  token=<reset-token> \
  password='NewSecurePass123!'
```

Expected: `200 OK`.

## 3. OAuth Endpoints

These endpoints depend on Google/GitHub OAuth configuration in the environment.

### 3.1 Start Google OAuth

```bash
http --follow GET $BASE_URL/api/v1/auth/oauth/google
```

### 3.2 Google OAuth callback

Usually handled by the provider after sign-in:

```bash
http --follow GET $BASE_URL/api/v1/auth/oauth/google/callback
```

### 3.3 Start GitHub OAuth

```bash
http --follow GET $BASE_URL/api/v1/auth/oauth/github
```

### 3.4 GitHub OAuth callback

```bash
http --follow GET $BASE_URL/api/v1/auth/oauth/github/callback
```

### 3.5 OAuth failure redirect

```bash
http --follow GET $BASE_URL/api/v1/auth/oauth/failure
```

Expected: redirect to the configured success or failure UI URL.

## 4. Organisation Endpoints

These endpoints require authentication. Use the `auth` session from the login step or send a bearer token.

### 4.1 List organisations

```bash
http --session=auth GET $BASE_URL/api/v1/organisations
```

### 4.2 Create an organisation

```bash
http --session=auth POST $BASE_URL/api/v1/organisations \
  name="Acme Team" \
  slug="acme-team" \
  description="Primary workspace for the Acme team"
```

Expected: `201 Created` and an organisation membership for the owner.

### 4.3 Get organisation details

```bash
http --session=auth GET $BASE_URL/api/v1/organisations/<orgId>
```

### 4.4 Update organisation

```bash
http --session=auth PATCH $BASE_URL/api/v1/organisations/<orgId> \
  name="Acme Team Updated" \
  description="Updated description"
```

### 4.5 Select organisation context

This switches the auth cookie/token context to the selected organisation.

```bash
http --session=auth POST $BASE_URL/api/v1/organisations/<orgId>/context
```

### 4.6 List organisation members

```bash
http --session=auth GET $BASE_URL/api/v1/organisations/<orgId>/memberships
```

### 4.7 Update member role

```bash
http --session=auth PATCH $BASE_URL/api/v1/organisations/<orgId>/memberships/<memberId> \
  role=viewer
```

### 4.8 Invite a member

```bash
http --session=auth POST $BASE_URL/api/v1/organisations/<orgId>/invitations \
  email="invitee@example.com" \
  role=member
```

Expected: `201 Created` with an invitation token and invitation URL.

### 4.9 Accept an invitation

Use the invitation token from the invitation response or email.

```bash
http POST $BASE_URL/api/v1/organisations/<orgId>/invitations/<invitation-token>/accept
```

### 4.10 Decline an invitation

```bash
http POST $BASE_URL/api/v1/organisations/<orgId>/invitations/<invitation-token>/decline
```

### 4.11 Delete an organisation

```bash
http --session=auth DELETE $BASE_URL/api/v1/organisations/<orgId>
```

Expected: `200 OK` and the organisation removed.

## 5. Integration Credential Endpoints

These endpoints require authentication and organisation context. Make sure you have selected an organisation first.

### 5.1 List credentials

```bash
http --session=auth GET $BASE_URL/api/v1/credentials
```

### 5.2 Get a provider credential

Supported providers: `github`, `jira`, `slack`, `confluence`

```bash
http --session=auth GET $BASE_URL/api/v1/credentials/github
```

### 5.3 Create or update a provider credential

```bash
http --session=auth PUT $BASE_URL/api/v1/credentials/github \
  credentials:='{"token":"ghp_exampletoken","webhookSecret":"secret-value"}' \
  settings:='{"baseUrl":"https://github.com"}'
```

You can also test other providers with provider-specific credential keys.

### 5.4 Disable a provider credential

```bash
http --session=auth DELETE $BASE_URL/api/v1/credentials/github
```

Expected: `200 OK` and the credential status changes to disabled.

## 6. Webhook Endpoints

These endpoints require trusted signatures or allowlist configuration, so they are usually tested after setting the provider secrets.

### 6.1 GitHub webhook

```bash
http POST $BASE_URL/api/v1/webhooks/github \
  X-GitHub-Event:push \
  X-Hub-Signature-256:<valid-signature> \
  eventType=push \
  repository:='{"full_name":"contextos/demo"}'
```

### 6.2 Jira webhook

```bash
http POST $BASE_URL/api/v1/webhooks/jira \
  X-Atlassian-Webhook-Identifier:example \
  X-Webhook-Signature:<valid-signature> \
  issue:='{"key":"CTX-1"}'
```

### 6.3 Slack webhook

```bash
http POST $BASE_URL/api/v1/webhooks/slack \
  X-Slack-Request-Timestamp:1710000000 \
  X-Slack-Signature:<valid-signature> \
  text="hello from slack"
```

Expected: trusted requests are accepted and normalized events are processed.

## 7. Recommended Test Order

1. Verify `/` and `/health`.
2. Register a user.
3. Resend verification email if needed.
4. Verify the email token.
5. Log in and keep the session cookies.
6. Create an organisation.
7. List and update organisation data.
8. Invite a member and test accept/decline flows.
9. Switch organisation context.
10. Create, list, fetch, and disable integration credentials.
11. Test webhook endpoints only after signing secrets are configured.
12. Log out at the end.

## 8. Notes

- Use `--session=auth` in HTTPie to persist cookies across requests.
- Endpoints that require a token in the URL need the raw token, not JWT cookies.
- If you get `400 Invalid JSON payload`, check that your body is valid JSON or that you are using HTTPie fields correctly.
- OAuth and webhooks depend on external configuration and may not be fully testable in a local environment without provider setup.

## 9. Billing Endpoints

### 9.1 Create a Pro checkout session

```bash
http --session=auth POST $BASE_URL/api/v1/billing/checkout/pro \
  org_id="org_001" \
  org_name="Acme Team" \
  user_email=$EMAIL \
  seats:=1
```

Expected: `201 Created` with a Stripe Checkout session URL.

### 9.2 Open the Stripe customer portal

```bash
http --session=auth POST $BASE_URL/api/v1/billing/portal \
  org_id="org_001"
```

Expected: `200 OK` with a Stripe Portal URL if the organisation has a Stripe customer attached.

### 9.3 Inspect usage summary

```bash
http --session=auth GET $BASE_URL/api/v1/billing/usage/org_001
```

### 9.4 Trigger the usage meter route

```bash
http --session=auth POST $BASE_URL/api/v1/billing/usage/ai-query \
  org_id="org_001" \
  units:=1
```

### 9.5 Stripe webhook testing

Use the Stripe CLI or a signed fixture so the `stripe-signature` header is valid.

```bash
http POST $BASE_URL/webhooks/stripe \
  stripe-signature:<valid-signature> \
  < checkout-session-completed.json
```

Expected: `200 OK` and the corresponding subscription record is updated.
