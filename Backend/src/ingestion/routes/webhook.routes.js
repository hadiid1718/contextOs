import { Router } from 'express';

import {
  receiveGithubWebhook,
  receiveJiraWebhook,
  receiveSlackWebhook,
} from '../controllers/webhook.controller.js';
import { verifyWebhookTrust } from '../middleware/webhookTrust.middleware.js';

const webhookRouter = Router();

webhookRouter.post('/github', verifyWebhookTrust('github'), receiveGithubWebhook);
webhookRouter.post('/jira', verifyWebhookTrust('jira'), receiveJiraWebhook);
webhookRouter.post('/slack', verifyWebhookTrust('slack'), receiveSlackWebhook);

export { webhookRouter };

