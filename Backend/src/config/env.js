import { existsSync } from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

const runtimeNodeEnv = process.env.NODE_ENV || 'development';
const envSpecificPath = path.resolve(process.cwd(), `.env.${runtimeNodeEnv}`);
const defaultEnvPath = path.resolve(process.cwd(), '.env');

dotenv.config({
  path: existsSync(envSpecificPath) ? envSpecificPath : defaultEnvPath,
});

const isProduction = runtimeNodeEnv === 'production';

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const toBoolean = (value, fallback = false) => {
  if (value === undefined) {
    return fallback;
  }

  return String(value).toLowerCase() === 'true';
};

const toCsvArray = value =>
  String(value || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);

const assertRequired = key => {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
};

if (isProduction) {
  [
    'MONGO_URI',
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
    'ORG_INVITATION_SECRET',
    'KAFKA_BROKERS',
    'KAFKA_CLIENT_ID',
    'KAFKA_TOPIC',
    'ENCRYPTION_KEY',
    'GITHUB_WEBHOOK_SECRET',
    'JIRA_WEBHOOK_SECRET',
    'SLACK_SIGNING_SECRET',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_CALLBACK_URL',
    'GITHUB_CLIENT_ID',
    'GITHUB_CLIENT_SECRET',
    'GITHUB_CALLBACK_URL',
  ].forEach(assertRequired);
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4001),
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/contextos-auth',
  appOrigin: process.env.APP_ORIGIN || 'http://localhost:3000',
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:4001',
  ingestionEnabled: process.env.INGESTION_ENABLED !== 'false',
  webhookBaseUrl:
    process.env.WEBHOOK_BASE_URL || 'http://localhost:4001/api/v1/webhooks',
  kafkaBrokers: toCsvArray(
    process.env.KAFKA_BROKERS ||
      process.env.INGESTION_KAFKA_BROKERS ||
      '127.0.0.1:9092'
  ),
  kafkaClientId:
    process.env.KAFKA_CLIENT_ID ||
    process.env.INGESTION_KAFKA_CLIENT_ID ||
    'contextos-ingestion-service',
  kafkaTopic:
    process.env.KAFKA_TOPIC ||
    process.env.INGESTION_KAFKA_TOPIC ||
    'events.ingestion',
  mockKafka: toBoolean(
    process.env.MOCK_KAFKA ?? process.env.INGESTION_MOCK_KAFKA,
    true
  ),

  ingestionEncryptionKey:
    process.env.ENCRYPTION_KEY ||
    process.env.INGESTION_ENCRYPTION_KEY ||
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  githubWebhookSecret:
    process.env.GITHUB_WEBHOOK_SECRET ||
    process.env.INGESTION_GITHUB_WEBHOOK_SECRET,
  jiraWebhookSecret:
    process.env.JIRA_WEBHOOK_SECRET ||
    process.env.INGESTION_JIRA_WEBHOOK_SECRET,
  slackSigningSecret:
    process.env.SLACK_SIGNING_SECRET ||
    process.env.INGESTION_SLACK_SIGNING_SECRET,
  githubWebhookIpAllowlist: toCsvArray(process.env.GITHUB_WEBHOOK_IP_ALLOWLIST),
  jiraWebhookIpAllowlist: toCsvArray(process.env.JIRA_WEBHOOK_IP_ALLOWLIST),
  slackWebhookIpAllowlist: toCsvArray(process.env.SLACK_WEBHOOK_IP_ALLOWLIST),

  pollCron: process.env.POLL_CRON || '*/15 * * * *',
  pollLookbackMinutes: toNumber(process.env.POLL_LOOKBACK_MINUTES, 15),

  retryMaxRetries: toNumber(process.env.RETRY_MAX_RETRIES, 4),
  retryBaseDelayMs: toNumber(process.env.RETRY_BASE_DELAY_MS, 250),
  retryMaxDelayMs: toNumber(process.env.RETRY_MAX_DELAY_MS, 10000),

  githubApiBaseUrl: process.env.GITHUB_API_BASE_URL || 'https://api.github.com',
  jiraApiBaseUrl:
    process.env.JIRA_API_BASE_URL || 'https://your-domain.atlassian.net',
  slackApiBaseUrl: process.env.SLACK_API_BASE_URL || 'https://slack.com/api',
  confluenceApiBaseUrl:
    process.env.CONFLUENCE_API_BASE_URL ||
    'https://your-domain.atlassian.net/wiki/rest/api',

  jwtAccessSecret:
    process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me',
  jwtRefreshSecret:
    process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me',
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  orgInvitationSecret:
    process.env.ORG_INVITATION_SECRET || 'dev-org-invitation-secret-change-me',
  orgInvitationExpiresIn: process.env.ORG_INVITATION_EXPIRES_IN || '48h',

  accessCookieName: process.env.ACCESS_COOKIE_NAME || 'accessToken',
  refreshCookieName: process.env.REFRESH_COOKIE_NAME || 'refreshToken',
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  cookieSameSite: process.env.COOKIE_SAME_SITE || 'lax',
  cookieDomain: process.env.COOKIE_DOMAIN || undefined,

  smtpHost: process.env.SMTP_HOST,
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpSecure: process.env.SMTP_SECURE === 'true',
  smtpUser: process.env.SMTP_USER,
  smtpPass: process.env.SMTP_PASS,
  mailFrom: process.env.MAIL_FROM || 'ContextOS <noreply@contextos.io>',

  googleClientId: process.env.GOOGLE_CLIENT_ID || 'disabled-google-client-id',
  googleClientSecret:
    process.env.GOOGLE_CLIENT_SECRET || 'disabled-google-client-secret',
  googleCallbackUrl:
    process.env.GOOGLE_CALLBACK_URL ||
    'http://localhost:4001/api/v1/auth/oauth/google/callback',
  githubClientId: process.env.GITHUB_CLIENT_ID || 'disabled-github-client-id',
  githubClientSecret:
    process.env.GITHUB_CLIENT_SECRET || 'disabled-github-client-secret',
  githubCallbackUrl:
    process.env.GITHUB_CALLBACK_URL ||
    'http://localhost:4001/api/v1/auth/oauth/github/callback',

  oauthSuccessRedirect:
    process.env.OAUTH_SUCCESS_REDIRECT || 'http://localhost:3000/auth/success',
  oauthFailureRedirect:
    process.env.OAUTH_FAILURE_REDIRECT || 'http://localhost:3000/auth/failure',
};
