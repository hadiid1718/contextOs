import { asyncHandler } from '../../utils/asyncHandler.js';
import { env } from '../../config/env.js';
import { publishNotificationEvent } from '../services/notificationPublisher.service.js';

export const publishNotification = asyncHandler(async (req, res) => {
  const { user_id, org_id, type, message } = req.body;

  const orgId = org_id || req.auth?.org_id;

  const result = await publishNotificationEvent({
    user_id,
    org_id: orgId || 'global',
    type,
    message,
  });

  res.status(202).json({
    message: result.skipped
      ? 'Notification publishing is disabled'
      : 'Notification event queued',
    topic: env.notificationKafkaTopic,
    skipped: result.skipped,
  });
});
