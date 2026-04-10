import { env } from '../../config/env.js';
import { Subscription } from '../models/Subscription.js';
import { retrieveStripeSubscription } from './stripe.service.js';

const planDefaults = {
  free: {
    maxUsers: env.freeMaxUsers,
    aiQueryLimit: env.freeAiQueryLimit,
  },
  pro: {
    maxUsers: env.freeMaxUsers,
    aiQueryLimit: env.proAiQueryLimit,
  },
  enterprise: {
    maxUsers: env.enterpriseMaxUsers,
    aiQueryLimit: env.enterpriseAiQueryLimit,
  },
};

export const getPlanLimits = (plan, seatCount = 1) => {
  if (plan === 'pro') {
    return {
      maxUsers: Math.max(1, seatCount),
      aiQueryLimit: env.proAiQueryLimit,
    };
  }

  if (plan === 'enterprise') {
    return {
      maxUsers: env.enterpriseMaxUsers,
      aiQueryLimit: env.enterpriseAiQueryLimit,
    };
  }

  return planDefaults.free;
};

export const getOrCreateSubscriptionForOrg = async orgId => {
  let subscription = await Subscription.findOne({ org_id: orgId });

  if (!subscription) {
    subscription = await Subscription.create({
      org_id: orgId,
      plan: 'free',
      status: 'active',
      maxUsers: env.freeMaxUsers,
      aiQueryLimit: env.freeAiQueryLimit,
    });
  }

  return subscription;
};

export const upsertSubscriptionFromCheckoutSession = async session => {
  const orgId = session.metadata?.org_id;
  if (!orgId) {
    return null;
  }

  const stripeSubscriptionId =
    typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription?.id || null;

  const stripeSubscription = stripeSubscriptionId
    ? await retrieveStripeSubscription(stripeSubscriptionId)
    : null;

  const seats = Number(session.metadata?.seats || 1);
  const limits = getPlanLimits('pro', seats);

  return Subscription.findOneAndUpdate(
    { org_id: orgId },
    {
      $set: {
        stripeCustomerId:
          stripeSubscription?.customer?.toString?.() ||
          session.customer?.toString?.() ||
          null,
        stripeSubscriptionId,
        stripePriceId:
          stripeSubscription?.items?.data?.[0]?.price?.id ||
          session.metadata?.stripe_price_id ||
          null,
        plan: 'pro',
        status: stripeSubscription?.status || 'active',
        seatCount: seats,
        maxUsers: limits.maxUsers,
        aiQueryLimit: limits.aiQueryLimit,
        currentPeriodStart: stripeSubscription?.current_period_start
          ? new Date(stripeSubscription.current_period_start * 1000)
          : null,
        currentPeriodEnd: stripeSubscription?.current_period_end
          ? new Date(stripeSubscription.current_period_end * 1000)
          : null,
        cancelAtPeriodEnd: Boolean(stripeSubscription?.cancel_at_period_end),
        canceledAt: null,
        metadata: {
          ...session.metadata,
          stripeCheckoutSessionId: session.id,
        },
      },
    },
    { upsert: true, new: true }
  );
};

export const markSubscriptionCanceled = async ({ subscriptionId, orgId }) => {
  const filter = subscriptionId
    ? { stripeSubscriptionId: subscriptionId }
    : { org_id: orgId };

  if (!subscriptionId && !orgId) {
    return null;
  }

  return Subscription.findOneAndUpdate(
    filter,
    {
      $set: {
        status: 'canceled',
        cancelAtPeriodEnd: true,
        canceledAt: new Date(),
      },
    },
    { new: true }
  );
};

export const markInvoicePaymentFailed = async ({ subscriptionId, orgId }) => {
  const filter = subscriptionId
    ? { stripeSubscriptionId: subscriptionId }
    : { org_id: orgId };

  if (!subscriptionId && !orgId) {
    return null;
  }

  return Subscription.findOneAndUpdate(
    filter,
    {
      $set: {
        status: 'past_due',
      },
    },
    { new: true }
  );
};

export const getSubscriptionByOrgId = async orgId =>
  getOrCreateSubscriptionForOrg(orgId);
