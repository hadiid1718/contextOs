import { z } from 'zod';

export const adminLoginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(12),
  }),
  query: z.object({}).optional().default({}),
  params: z.object({}).optional().default({}),
});

export const emptyBodySchema = z.object({
  body: z.object({}).optional().default({}),
  query: z.object({}).optional().default({}),
  params: z.object({}).optional().default({}),
});
