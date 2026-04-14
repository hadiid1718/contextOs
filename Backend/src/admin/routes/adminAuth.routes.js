import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import { validate } from '../../middleware/validate.middleware.js';
import { login, logout, me } from '../controllers/adminAuth.controller.js';
import { requireSuperadmin } from '../middleware/requireSuperadmin.middleware.js';
import {
  adminLoginSchema,
  emptyBodySchema,
} from '../validators/adminAuth.schemas.js';

const adminLoginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Too many login attempts. Try again in 15 minutes.',
  },
});

const adminAuthRouter = Router();

adminAuthRouter.post(
  '/login',
  adminLoginRateLimiter,
  validate(adminLoginSchema),
  login
);
adminAuthRouter.post(
  '/logout',
  requireSuperadmin,
  validate(emptyBodySchema),
  logout
);
adminAuthRouter.get('/me', requireSuperadmin, me);

export { adminAuthRouter };
