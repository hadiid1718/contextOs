import { z } from 'zod';

export const OrgSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string().optional(),
});

