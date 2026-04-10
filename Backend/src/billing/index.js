import { env } from '../config/env.js';
import { billingRouter } from './routes/billing.routes.js';
import { stripeWebhookRouter } from './routes/stripeWebhook.routes.js';

export const getBillingStatus = () => ({
  enabled: env.billingEnabled,
  stripeConfigured: Boolean(env.stripeSecretKey && env.stripeProPriceId),
  webhookConfigured: Boolean(env.stripeWebhookSecret),
});

export { billingRouter, stripeWebhookRouter };
