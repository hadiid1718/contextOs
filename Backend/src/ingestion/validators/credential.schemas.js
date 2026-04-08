import { z } from 'zod';

const providerSchema = z.enum(['github', 'jira', 'slack', 'confluence']);

export const providerParamSchema = z.object({
  params: z.object({
    provider: providerSchema,
  }),
});

export const upsertCredentialSchema = z.object({
  params: z.object({
    provider: providerSchema,
  }),
  body: z.object({
    credentials: z.record(z.any()).refine(value => Object.keys(value).length > 0, {
      message: 'credentials must not be empty',
    }),
    settings: z.record(z.any()).optional(),
  }),
});

