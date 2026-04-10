import { env } from '../../config/env.js';
import { AppError } from '../../utils/appError.js';
import { stripe } from '../services/stripe.service.js';

export const verifyStripeWebhook = (req, _res, next) => {
  if (!env.stripeWebhookSecret) {
    return next(new AppError('Stripe webhook secret is not configured', 503));
  }

  const signature = req.headers['stripe-signature'];
  if (!signature) {
    return next(new AppError('Missing Stripe signature header', 400));
  }

  try {
    req.stripeEvent = stripe.webhooks.constructEvent(
      req.body,
      signature,
      env.stripeWebhookSecret
    );
    return next();
  } catch (error) {
    return next(
      new AppError('Invalid Stripe webhook signature', 400, error.message)
    );
  }
};
