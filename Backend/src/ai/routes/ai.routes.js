import { Router } from 'express';

import { streamRagQuery } from '../controllers/ai.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { streamRagQuerySchema } from '../validators/ai.schemas.js';
import { usageMetering } from '../../billing/middleware/usageMetering.middleware.js';

const aiRouter = Router();

aiRouter.post(
  '/query/stream',
  requireAuth,
  validate(streamRagQuerySchema),
  usageMetering({ units: 1 }),
  streamRagQuery
);

export { aiRouter };
