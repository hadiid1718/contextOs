# Billing Module

This module handles Stripe subscriptions, customer portal access, webhook processing, and monthly AI usage metering per organisation.

## Key routes

- `POST /api/v1/billing/checkout/pro`
- `POST /api/v1/billing/portal`
- `GET /api/v1/billing/subscriptions/:org_id`
- `GET /api/v1/billing/usage/:org_id`
- `POST /api/v1/billing/usage/ai-query`
- `POST /webhooks/stripe`

## Notes

- Stripe webhook requests must keep the raw body intact for signature verification.
- AI query metering is enforced by `usageMetering` and shared with the AI route.
