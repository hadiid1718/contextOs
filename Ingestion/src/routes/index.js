import { Router } from 'express';

import { webhookRouter } from './webhook.routes.js';
import { credentialRouter } from './credential.routes.js';

export const router = Router();

router.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

router.use('/webhooks', webhookRouter);
router.use('/credentials', credentialRouter);

