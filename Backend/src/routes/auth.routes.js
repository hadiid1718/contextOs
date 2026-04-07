import { Router } from 'express';

import {
  forgotPassword,
  login,
  logout,
  me,
  refresh,
  register,
  resendVerification,
  resetPassword,
  verifyEmail,
} from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';
import { authRateLimiter } from '../middleware/rateLimit.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from '../validators/auth.schemas.js';

const authRouter = Router();

authRouter.use(authRateLimiter);

authRouter.post('/register', validate(registerSchema), register);
authRouter.post('/login', validate(loginSchema), login);
authRouter.post('/refresh', refresh);
authRouter.post('/logout', logout);

authRouter.get('/me', requireAuth, requireRole('viewer'), me);

authRouter.get(
  '/verify-email/:token',
  validate(verifyEmailSchema),
  verifyEmail
);
authRouter.post(
  '/resend-verification',
  validate(resendVerificationSchema),
  resendVerification
);

authRouter.post(
  '/forgot-password',
  validate(forgotPasswordSchema),
  forgotPassword
);
authRouter.post(
  '/reset-password',
  validate(resetPasswordSchema),
  resetPassword
);

export { authRouter };
