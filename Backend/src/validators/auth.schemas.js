import { z } from "zod";

const roles = ["owner", "admin", "member", "viewer"];

export const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100),
    email: z.string().email(),
    password: z.string().min(8).max(128),
    role: z.enum(roles).optional(),
    organizationId: z.string().min(1).optional(),
  }),
  query: z.object({}).optional().default({}),
  params: z.object({}).optional().default({}),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8).max(128),
  }),
  query: z.object({}).optional().default({}),
  params: z.object({}).optional().default({}),
});

export const resendVerificationSchema = z.object({
  body: z.object({
    email: z.string().email(),
  }),
  query: z.object({}).optional().default({}),
  params: z.object({}).optional().default({}),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email(),
  }),
  query: z.object({}).optional().default({}),
  params: z.object({}).optional().default({}),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(10),
    password: z.string().min(8).max(128),
  }),
  query: z.object({}).optional().default({}),
  params: z.object({}).optional().default({}),
});

export const verifyEmailSchema = z.object({
  body: z.object({}).optional().default({}),
  query: z.object({}).optional().default({}),
  params: z.object({
    token: z.string().min(10),
  }),
});
