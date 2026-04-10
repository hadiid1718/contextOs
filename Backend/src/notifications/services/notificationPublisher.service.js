import { env } from '../../config/env.js';
import logger from '../../config/loggers.js';
import { publishToKafka } from '../../ingestion/config/kafka.js';

export const publishNotificationEvent = async event => {
  if (!env.notificationsEnabled) {
    return { skipped: true };
  }

  await publishToKafka(env.notificationKafkaTopic, {
    user_id: event.user_id,
    org_id: event.org_id,
    type: event.type,
    message: event.message,
  });

  return { skipped: false };
};

export const emitNotificationSafely = async event => {
  try {
    return await publishNotificationEvent(event);
  } catch (error) {
    logger.warn(
      JSON.stringify({
        service: 'notifications',
        message: 'Notification publish failed',
        error: error?.message || String(error),
        event,
      })
    );

    return { skipped: true, failed: true };
  }
};
