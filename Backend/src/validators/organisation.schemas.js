import { z } from 'zod';

const roles = ['owner', 'admin', 'member', 'viewer'];

const organisationParamsSchema = z.object({
  orgId: z.string().min(1),
});

const invitationParamsSchema = z.object({
  orgId: z.string().min(1),
  token: z.string().min(20),
});

export const createOrganisationSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(120),
    slug: z.string().min(2).max(120).optional(),
    description: z.string().max(500).optional(),
  }),
  query: z.object({}).optional().default({}),
  params: z.object({}).optional().default({}),
});

export const updateOrganisationSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(120).optional(),
    slug: z.string().min(2).max(120).optional(),
    description: z.string().max(500).optional(),
    status: z.enum(['active', 'archived']).optional(),
  }),
  query: z.object({}).optional().default({}),
  params: organisationParamsSchema,
});

export const inviteMemberSchema = z.object({
  body: z.object({
    email: z.string().email(),
    role: z.enum(roles).default('member'),
  }),
  query: z.object({}).optional().default({}),
  params: organisationParamsSchema,
});

export const selectOrganisationContextSchema = z.object({
  body: z.object({}).optional().default({}),
  query: z.object({}).optional().default({}),
  params: organisationParamsSchema,
});

export const listOrganisationMembersSchema = z.object({
  body: z.object({}).optional().default({}),
  query: z.object({}).optional().default({}),
  params: organisationParamsSchema,
});

export const updateMemberRoleSchema = z.object({
  body: z.object({
    role: z.enum(roles),
  }),
  query: z.object({}).optional().default({}),
  params: z.object({
    orgId: z.string().min(1),
    memberId: z.string().min(1),
  }),
});

export const invitationActionSchema = z.object({
  body: z.object({}).optional().default({}),
  query: z.object({}).optional().default({}),
  params: invitationParamsSchema,
});

export const getOrganisationSchema = z.object({
  body: z.object({}).optional().default({}),
  query: z.object({}).optional().default({}),
  params: organisationParamsSchema,
});
