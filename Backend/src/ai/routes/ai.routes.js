import { Router } from 'express';

import { streamRagQuery } from '../controllers/ai.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { streamRagQuerySchema } from '../validators/ai.schemas.js';

const aiRouter = Router();

aiRouter.post('/query/stream', requireAuth, validate(streamRagQuerySchema), streamRagQuery);

export { aiRouter };

