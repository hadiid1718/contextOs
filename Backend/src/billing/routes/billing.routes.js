import { Router } from 'express';

import { requireAuth } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { usageMetering } from '../middleware/usageMetering.middleware.js';
import {
  checkoutSchema,
  orgParamsSchema,
  portalSchema,
  usageTrackSchema,
} from '../validators/billing.schemas.js';
import {
  createPortal,
  createProCheckout,
  getSubscription,
  getUsage,
  trackUsage,
} from '../controllers/billing.controller.js';

const billingRouter = Router();

billingRouter.post(
  '/checkout/pro',
  requireAuth,
  validate(checkoutSchema),
  createProCheckout
);
billingRouter.post(
  '/portal',
  requireAuth,
  validate(portalSchema),
  createPortal
);
billingRouter.get(
  '/subscriptions/:org_id',
  requireAuth,
  validate(orgParamsSchema),
  getSubscription
);
billingRouter.get(
  '/usage/:org_id',
  requireAuth,
  validate(orgParamsSchema),
  getUsage
);
billingRouter.post(
  '/usage/ai-query',
  requireAuth,
  validate(usageTrackSchema),
  usageMetering({ units: 1 }),
  trackUsage
);

export { billingRouter };
