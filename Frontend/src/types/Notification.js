import { z } from 'zod';

export const NotificationSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string().optional(),
  read: z.boolean().default(false),
  createdAt: z.string().optional(),
});

