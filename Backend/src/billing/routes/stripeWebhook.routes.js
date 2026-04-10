import express from 'express';

import { handleStripeWebhook } from '../controllers/billing.controller.js';
import { verifyStripeWebhook } from '../middleware/stripeWebhook.middleware.js';

const stripeWebhookRouter = express.Router();

stripeWebhookRouter.post(
  '/stripe',
  express.raw({ type: 'application/json' }),
  verifyStripeWebhook,
  handleStripeWebhook
);

export { stripeWebhookRouter };
