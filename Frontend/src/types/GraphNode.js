import { z } from 'zod';

export const GraphNodeSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: z.string(),
  metadata: z.record(z.any()).optional(),
});

