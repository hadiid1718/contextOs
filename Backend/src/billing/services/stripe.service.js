import Stripe from 'stripe';

import { env } from '../../config/env.js';

export const stripe = new Stripe(env.stripeSecretKey, {
  apiVersion: '2024-06-20',
});

export const createProCheckoutSession = async ({
  orgId,
  orgName,
  userId,
  userEmail,
  seats = 1,
  interval = 'monthly',
  successUrl,
  cancelUrl,
  metadata = {},
}) => {
  const normalizedInterval = interval === 'annual' ? 'annual' : 'monthly';
  const selectedPriceId =
    normalizedInterval === 'annual' && env.stripeProAnnualPriceId
      ? env.stripeProAnnualPriceId
      : env.stripeProPriceId;

  const payload = {
    mode: 'subscription',
    success_url: successUrl,
    cancel_url: cancelUrl,
    line_items: [{ price: selectedPriceId, quantity: seats }],
    subscription_data: {
      metadata: {
        org_id: orgId,
        org_name: orgName || orgId,
        user_id: userId || '',
        plan: 'pro',
        seats: String(seats),
        billing_interval: normalizedInterval,
        ...metadata,
      },
    },
    metadata: {
      org_id: orgId,
      org_name: orgName || orgId,
      user_id: userId || '',
      plan: 'pro',
      seats: String(seats),
      billing_interval: normalizedInterval,
      stripe_price_id: selectedPriceId,
      ...metadata,
    },
  };

  if (userEmail) {
    payload.customer_email = userEmail;
  }

  const session = await stripe.checkout.sessions.create(payload);

  return session;
};

export const createCustomerPortalSession = async ({ customerId, returnUrl }) =>
  stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl || env.stripeCustomerPortalReturnUrl,
  });

export const retrieveStripeSubscription = async subscriptionId =>
  stripe.subscriptions.retrieve(subscriptionId, {
    expand: ['items.data.price', 'latest_invoice'],
  });

export const listCustomerInvoices = async ({ customerId, limit = 20 }) => {
  const invoices = await stripe.invoices.list({
    customer: customerId,
    limit,
  });

  return invoices.data || [];
};
