import { z } from 'zod';

export const streamRagQuerySchema = z.object({
  body: z.object({
    org_id: z.string().min(1).max(120),
    question: z.string().min(3).max(4000),
    ai_provider: z
      .enum(['auto', 'openai', 'gemini'])
      .optional()
      .default('auto'),
  }),
  query: z.object({}).optional().default({}),
  params: z.object({}).optional().default({}),
});
