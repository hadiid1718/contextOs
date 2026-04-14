import { asyncHandler } from '../../utils/asyncHandler.js';
import { AppError } from '../../utils/appError.js';
import { env } from '../../config/env.js';
import { publishNotificationEvent } from '../services/notificationPublisher.service.js';
import {
  getNotificationPreferencesForUser,
  listNotificationsForUser,
  markAllNotificationsReadForUser,
  markNotificationReadForUser,
  updateNotificationPreferencesForUser,
} from '../services/notification.service.js';

export const publishNotification = asyncHandler(async (req, res) => {
  const { user_id, org_id, type, severity, message, route, metadata } =
    req.body;

  const orgId = org_id || req.auth?.org_id;

  const result = await publishNotificationEvent({
    user_id,
    org_id: orgId || 'global',
    type,
    severity,
    message,
    route,
    metadata,
  });

  res.status(202).json({
    message: result.skipped
      ? 'Notification skipped'
      : 'Notification event published',
    topic: env.notificationKafkaTopic,
    skipped: result.skipped,
    reason: result.reason || null,
    notification: result.notification || null,
  });
});

export const listNotifications = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub;

  if (!userId) {
    throw new AppError('Authentication required', 401);
  }

  const result = await listNotificationsForUser({
    userId,
    orgId: req.auth?.org_id || null,
    page: req.query.page,
    limit: req.query.limit,
    unreadOnly: req.query.unreadOnly,
  });

  res.status(200).json({
    message: 'Notifications fetched successfully',
    ...result,
  });
});

export const markNotificationRead = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub;

  if (!userId) {
    throw new AppError('Authentication required', 401);
  }

  const notification = await markNotificationReadForUser({
    userId,
    notificationId: req.params.id,
  });

  res.status(200).json({
    message: 'Notification marked as read',
    data: notification,
  });
});

export const markAllNotificationsRead = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub;

  if (!userId) {
    throw new AppError('Authentication required', 401);
  }

  const result = await markAllNotificationsReadForUser({
    userId,
    orgId: req.auth?.org_id || null,
  });

  res.status(200).json({
    message: 'All notifications marked as read',
    updatedCount: result.updatedCount,
  });
});

export const getNotificationPreferences = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub;

  if (!userId) {
    throw new AppError('Authentication required', 401);
  }

  const data = await getNotificationPreferencesForUser(userId);

  res.status(200).json({
    message: 'Notification preferences fetched successfully',
    data,
  });
});

export const updateNotificationPreferences = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub;

  if (!userId) {
    throw new AppError('Authentication required', 401);
  }

  const data = await updateNotificationPreferencesForUser({
    userId,
    payload: req.body,
  });

  res.status(200).json({
    message: 'Notification preferences updated successfully',
    data,
  });
});
