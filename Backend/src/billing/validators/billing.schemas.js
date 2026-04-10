import { z } from 'zod';

export const checkoutSchema = z.object({
  body: z.object({
    org_id: z.string().min(1),
    org_name: z.string().min(1).max(120).optional(),
    user_id: z.string().min(1).optional(),
    user_email: z.string().email().optional(),
    seats: z.coerce.number().int().min(1).max(1000).optional().default(1),
    success_url: z.string().url().optional(),
    cancel_url: z.string().url().optional(),
    metadata: z.record(z.string()).optional(),
  }),
  query: z.object({}).optional().default({}),
  params: z.object({}).optional().default({}),
});

export const portalSchema = z.object({
  body: z.object({
    org_id: z.string().min(1),
    customer_id: z.string().min(1).optional(),
    return_url: z.string().url().optional(),
  }),
  query: z.object({}).optional().default({}),
  params: z.object({}).optional().default({}),
});

export const usageTrackSchema = z.object({
  body: z.object({
    org_id: z.string().min(1),
    units: z.coerce.number().int().min(1).max(100).optional().default(1),
  }),
  query: z.object({}).optional().default({}),
  params: z.object({}).optional().default({}),
});

export const orgParamsSchema = z.object({
  body: z.object({}).optional().default({}),
  query: z.object({}).optional().default({}),
  params: z.object({ org_id: z.string().min(1) }),
});
