import { z } from 'zod';

export const SubscriptionSchema = z.object({
  id: z.string(),
  plan: z.string(),
  status: z.string(),
  renewsAt: z.string().optional(),
});

