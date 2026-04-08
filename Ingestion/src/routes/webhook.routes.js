import { Router } from 'express';

import {
  githubWebhook,
  jiraWebhook,
  slackWebhook,
} from '../controllers/webhook.controller.js';
import { enforceIpAllowlist } from '../middleware/ipAllowlist.middleware.js';
import {
  verifyGithubSignature,
  verifyJiraSignature,
  verifySlackSignature,
} from '../middleware/signature.middleware.js';
import { env } from '../config/env.js';

export const webhookRouter = Router();

webhookRouter.post(
  '/github',
  enforceIpAllowlist(env.githubWebhookIpAllowlist),
  verifyGithubSignature(env.githubWebhookSecret),
  githubWebhook
);

webhookRouter.post(
  '/jira',
  enforceIpAllowlist(env.jiraWebhookIpAllowlist),
  verifyJiraSignature(env.jiraWebhookSecret),
  jiraWebhook
);

webhookRouter.post(
  '/slack',
  enforceIpAllowlist(env.slackWebhookIpAllowlist),
  verifySlackSignature(env.slackSigningSecret),
  slackWebhook
);

