import { env } from '../../config/env.js';
import { AppError } from '../../utils/appError.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import {
  createCustomerPortalSession,
  createProCheckoutSession,
} from '../services/stripe.service.js';
import {
  getSubscriptionByOrgId,
  markInvoicePaymentFailed,
  markSubscriptionCanceled,
  upsertSubscriptionFromCheckoutSession,
} from '../services/subscription.service.js';
import {
  getUsageSummary,
  incrementUsageRecord,
} from '../services/usage.service.js';

export const createProCheckout = asyncHandler(async (req, res) => {
  if (!env.billingEnabled) {
    throw new AppError('Billing module is disabled', 503);
  }

  if (!env.stripeSecretKey || !env.stripeProPriceId) {
    throw new AppError('Stripe checkout is not configured', 503);
  }

  const userId = req.auth?.sub || req.body.user_id || '';
  const userEmail = req.auth?.email || req.body.user_email || null;
  const orgName = req.body.org_name || req.body.org_id;
  const seats = req.body.seats || 1;

  const session = await createProCheckoutSession({
    orgId: req.body.org_id,
    orgName,
    userId,
    userEmail,
    seats,
    successUrl:
      req.body.success_url ||
      `${env.appOrigin}/billing/success?org_id=${req.body.org_id}`,
    cancelUrl:
      req.body.cancel_url ||
      `${env.appOrigin}/billing/cancel?org_id=${req.body.org_id}`,
    metadata: req.body.metadata || {},
  });

  res.status(201).json({
    message: 'Checkout session created',
    checkoutSessionId: session.id,
    url: session.url,
  });
});

export const createPortal = asyncHandler(async (req, res) => {
  if (!env.billingEnabled) {
    throw new AppError('Billing module is disabled', 503);
  }

  if (!env.stripeSecretKey) {
    throw new AppError('Stripe portal is not configured', 503);
  }

  const subscription = await getSubscriptionByOrgId(req.body.org_id);
  const customerId = req.body.customer_id || subscription.stripeCustomerId;

  if (!customerId) {
    throw new AppError('No Stripe customer found for this organisation', 404);
  }

  const session = await createCustomerPortalSession({
    customerId,
    returnUrl: req.body.return_url,
  });

  res.status(200).json({
    message: 'Customer portal session created',
    url: session.url,
  });
});

export const getSubscription = asyncHandler(async (req, res) => {
  const subscription = await getSubscriptionByOrgId(req.params.org_id);
  res.status(200).json({ subscription });
});

export const getUsage = asyncHandler(async (req, res) => {
  const usage = await getUsageSummary(req.params.org_id);
  res.status(200).json(usage);
});

export const trackUsage = asyncHandler(async (req, res) => {
  const units = req.body.units || 1;
  const updated =
    req.billingUsage ||
    (await incrementUsageRecord({ orgId: req.body.org_id, units }));

  res.status(200).json({
    message: 'Usage recorded',
    usageCount: updated.usageCount,
    periodKey: updated.periodKey,
  });
});

export const handleStripeWebhook = asyncHandler(async (req, res) => {
  const event = req.stripeEvent;

  if (!event) {
    throw new AppError('Stripe webhook event is missing', 400);
  }

  let result;

  switch (event.type) {
    case 'checkout.session.completed':
      result = await upsertSubscriptionFromCheckoutSession(event.data.object);
      break;
    case 'customer.subscription.deleted':
      result = await markSubscriptionCanceled({
        subscriptionId: event.data.object.id,
        orgId: event.data.object.metadata?.org_id,
      });
      break;
    case 'invoice.payment_failed':
      result = await markInvoicePaymentFailed({
        subscriptionId: event.data.object.subscription,
        orgId: event.data.object.metadata?.org_id,
      });
      break;
    default:
      result = { ignored: true };
  }

  res.status(200).json({
    received: true,
    type: event.type,
    result,
  });
});
