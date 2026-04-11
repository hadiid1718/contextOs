import { z } from 'zod';

export const NotificationSchema = z.object({
  id: z.string(),
  user_id: z.string().optional(),
  org_id: z.string().optional(),
  type: z.string().optional(),
  severity: z.enum(['info', 'success', 'warning', 'error']).default('info'),
  message: z.string(),
  route: z.string().default('/notifications'),
  read: z.boolean().default(false),
  createdAt: z.string().nullable().optional(),
  metadata: z.record(z.any()).optional(),
});

