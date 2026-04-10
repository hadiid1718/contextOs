import { z } from 'zod';

export const publishNotificationSchema = z.object({
  body: z.object({
    user_id: z.string().min(1),
    org_id: z.string().min(1).optional(),
    type: z.string().min(1),
    message: z.string().min(1).max(2000),
  }),
  query: z.object({}).optional().default({}),
  params: z.object({}).optional().default({}),
});
