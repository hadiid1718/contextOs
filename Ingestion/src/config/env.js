import dotenv from 'dotenv';

dotenv.config();

const required = key => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

const parseList = value =>
  (value || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4010),

  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/contextos-ingestion',

  kafkaBrokers: parseList(process.env.KAFKA_BROKERS || '127.0.0.1:9092'),
  kafkaClientId: process.env.KAFKA_CLIENT_ID || 'contextos-ingestion-service',
  kafkaTopic: process.env.KAFKA_TOPIC || 'events.ingestion',
  mockKafka: process.env.MOCK_KAFKA === 'true',

  encryptionKey:
    process.env.ENCRYPTION_KEY ||
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',

  githubWebhookSecret: process.env.GITHUB_WEBHOOK_SECRET || '',
  jiraWebhookSecret: process.env.JIRA_WEBHOOK_SECRET || '',
  slackSigningSecret: process.env.SLACK_SIGNING_SECRET || '',
  webhookBaseUrl:
    process.env.WEBHOOK_BASE_URL ||
    'https://your-public-domain.com/api/v1/webhooks',

  githubWebhookIpAllowlist: parseList(process.env.GITHUB_WEBHOOK_IP_ALLOWLIST),
  jiraWebhookIpAllowlist: parseList(process.env.JIRA_WEBHOOK_IP_ALLOWLIST),
  slackWebhookIpAllowlist: parseList(process.env.SLACK_WEBHOOK_IP_ALLOWLIST),

  pollCron: process.env.POLL_CRON || '*/15 * * * *',
  pollLookbackMinutes: Number(process.env.POLL_LOOKBACK_MINUTES || 15),

  githubApiBaseUrl: process.env.GITHUB_API_BASE_URL || 'https://api.github.com',
  jiraApiBaseUrl: process.env.JIRA_API_BASE_URL || '',
  slackApiBaseUrl: process.env.SLACK_API_BASE_URL || 'https://slack.com/api',
  confluenceApiBaseUrl: process.env.CONFLUENCE_API_BASE_URL || '',
};

if (env.nodeEnv === 'production') {
  required('MONGO_URI');
  required('KAFKA_BROKERS');
  required('ENCRYPTION_KEY');
}

