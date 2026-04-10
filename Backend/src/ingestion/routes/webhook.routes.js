import { Router } from 'express';

import {
  githubWebhook,
  jiraWebhook,
  slackWebhook,
} from '../controllers/webhook.controller.js';
import {
  requireIngestionEnabled,
  resolveIngestionOrgContext,
} from '../middleware/requestContext.middleware.js';
import { requireWebhookTrust } from '../middleware/webhookTrust.middleware.js';

const webhookRouter = Router();

webhookRouter.use(requireIngestionEnabled);

webhookRouter.post(
  '/github',
  requireWebhookTrust('github'),
  resolveIngestionOrgContext,
  githubWebhook
);

webhookRouter.post(
  '/jira',
  requireWebhookTrust('jira'),
  resolveIngestionOrgContext,
  jiraWebhook
);

webhookRouter.post(
  '/slack',
  requireWebhookTrust('slack'),
  resolveIngestionOrgContext,
  slackWebhook
);

export { webhookRouter };
