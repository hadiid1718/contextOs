import { z } from 'zod';

export const adminLogsQuerySchema = z.object({
  body: z.object({}).optional().default({}),
  query: z
    .object({
      q: z.string().max(120).optional().default(''),
      limit: z.coerce.number().int().min(1).max(200).optional().default(50),
      offset: z.coerce.number().int().min(0).optional().default(0),
    })
    .optional()
    .default({ q: '', limit: 50, offset: 0 }),
  params: z.object({}).optional().default({}),
});
