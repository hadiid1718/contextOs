import { Router } from 'express';

import { requireAuth } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { publishNotification } from '../controllers/notification.controller.js';
import { publishNotificationSchema } from '../validators/notification.schemas.js';

const notificationRouter = Router();

notificationRouter.post(
  '/publish',
  requireAuth,
  validate(publishNotificationSchema),
  publishNotification
);

export { notificationRouter };
