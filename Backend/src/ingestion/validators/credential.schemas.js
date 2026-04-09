import { z } from 'zod';

const providers = ['github', 'jira', 'slack', 'confluence'];
const credentialStatuses = ['active', 'paused', 'revoked'];

export const credentialProviderParamSchema = z.object({
  body: z.object({}).optional().default({}),
  query: z.object({}).optional().default({}),
  params: z.object({
    provider: z.enum(providers),
  }),
});

export const upsertCredentialSchema = z.object({
  body: z.object({
    accountName: z.string().min(2).max(160),
    externalId: z.string().min(1).optional(),
    status: z.enum(credentialStatuses).optional(),
    scopes: z.array(z.string().min(1)).optional().default([]),
    metadata: z.record(z.string(), z.any()).optional().default({}),
    credentials: z
      .record(z.string(), z.any())
      .refine(value => Object.keys(value).length > 0, {
        message: 'credentials are required',
      }),
  }),
  query: z.object({}).optional().default({}),
  params: z.object({
    provider: z.enum(providers),
  }),
});

