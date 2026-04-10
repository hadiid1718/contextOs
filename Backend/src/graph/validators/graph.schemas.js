import { z } from 'zod';

export const getGraphNodeSchema = z.object({
  body: z.object({}).optional().default({}),
  query: z.object({}).optional().default({}),
  params: z.object({
    id: z.string().min(1),
  }),
});

export const getGraphCausalChainSchema = z.object({
  body: z.object({}).optional().default({}),
  query: z.object({
    max_hops: z.coerce.number().int().min(1).max(5).optional(),
  }),
  params: z.object({
    node_id: z.string().min(1),
  }),
});

export const getGraphDecisionsSchema = z.object({
  body: z.object({}).optional().default({}),
  query: z.object({
    org_id: z.string().min(1),
    file: z.string().min(1).optional(),
  }),
  params: z.object({}).optional().default({}),
});
