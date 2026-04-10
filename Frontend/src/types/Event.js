import { z } from 'zod';

export const EventSchema = z.object({
  id: z.string(),
  provider: z.string(),
  eventType: z.string(),
  createdAt: z.string(),
});

