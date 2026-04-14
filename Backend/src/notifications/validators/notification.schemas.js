import { z } from 'zod';

const booleanQuerySchema = z.preprocess(value => {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }

  return value;
}, z.boolean());

export const publishNotificationSchema = z.object({
  body: z.object({
    user_id: z.string().min(1),
    org_id: z.string().min(1).optional(),
    type: z.string().min(1),
    severity: z.enum(['info', 'success', 'warning', 'error']).optional(),
    message: z.string().min(1).max(2000),
    route: z.string().min(1).optional(),
    metadata: z.record(z.string(), z.any()).optional(),
  }),
  query: z.object({}).optional().default({}),
  params: z.object({}).optional().default({}),
});

export const listNotificationsSchema = z.object({
  body: z.object({}).optional().default({}),
  params: z.object({}).optional().default({}),
  query: z
    .object({
      page: z.coerce.number().int().min(1).max(10000).optional(),
      limit: z.coerce.number().int().min(1).max(50).optional(),
      unreadOnly: booleanQuerySchema.optional(),
    })
    .optional()
    .default({}),
});

export const markNotificationReadSchema = z.object({
  body: z.object({}).optional().default({}),
  query: z.object({}).optional().default({}),
  params: z.object({
    id: z.string().min(1),
  }),
});

export const updateNotificationPreferencesSchema = z.object({
  body: z
    .object({
      typePreferences: z
        .object({
          info: z.boolean().optional(),
          success: z.boolean().optional(),
          warning: z.boolean().optional(),
          error: z.boolean().optional(),
        })
        .optional(),
      emailDigestFrequency: z.enum(['instant', 'hourly', 'daily']).optional(),
    })
    .refine(
      value => {
        const hasTypePreferenceUpdates =
          value.typePreferences &&
          Object.keys(value.typePreferences).length > 0;

        return (
          hasTypePreferenceUpdates ||
          typeof value.emailDigestFrequency === 'string'
        );
      },
      {
        message:
          'Provide at least one preference field to update (typePreferences or emailDigestFrequency)',
      }
    ),
  query: z.object({}).optional().default({}),
  params: z.object({}).optional().default({}),
});

export const getNotificationPreferencesSchema = z.object({
  body: z.object({}).optional().default({}),
  query: z.object({}).optional().default({}),
  params: z.object({}).optional().default({}),
});
