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
  successUrl,
  cancelUrl,
  metadata = {},
}) => {
  const payload = {
    mode: 'subscription',
    success_url: successUrl,
    cancel_url: cancelUrl,
    line_items: [{ price: env.stripeProPriceId, quantity: seats }],
    subscription_data: {
      metadata: {
        org_id: orgId,
        org_name: orgName || orgId,
        user_id: userId || '',
        plan: 'pro',
        seats: String(seats),
        ...metadata,
      },
    },
    metadata: {
      org_id: orgId,
      org_name: orgName || orgId,
      user_id: userId || '',
      plan: 'pro',
      seats: String(seats),
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
