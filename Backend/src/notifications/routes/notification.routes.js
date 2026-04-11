import { Router } from 'express';

import { requireAuth } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import {
  getNotificationPreferences,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  publishNotification,
  updateNotificationPreferences,
} from '../controllers/notification.controller.js';
import {
  getNotificationPreferencesSchema,
  listNotificationsSchema,
  markNotificationReadSchema,
  publishNotificationSchema,
  updateNotificationPreferencesSchema,
} from '../validators/notification.schemas.js';

const notificationRouter = Router();

notificationRouter.get('/', requireAuth, validate(listNotificationsSchema), listNotifications);

notificationRouter.post(
  '/:id/read',
  requireAuth,
  validate(markNotificationReadSchema),
  markNotificationRead
);

notificationRouter.post('/read-all', requireAuth, markAllNotificationsRead);

notificationRouter.get(
  '/preferences',
  requireAuth,
  validate(getNotificationPreferencesSchema),
  getNotificationPreferences
);

notificationRouter.patch(
  '/preferences',
  requireAuth,
  validate(updateNotificationPreferencesSchema),
  updateNotificationPreferences
);

notificationRouter.post(
  '/publish',
  requireAuth,
  validate(publishNotificationSchema),
  publishNotification
);

export { notificationRouter };
