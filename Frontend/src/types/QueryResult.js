import { z } from 'zod';

export const QueryResultSchema = z.object({
  rows: z.array(z.record(z.any())),
  total: z.number().optional(),
});

