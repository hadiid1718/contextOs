import Redis from 'ioredis';

import { env } from '../../config/env.js';
import logger from '../../config/loggers.js';

const gatewayLogger = logger.child({ service: 'stackmind-api-gateway' });

export const gatewayRedis = new Redis(env.redisUrl, {
  lazyConnect: true,
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false,
});

gatewayRedis.on('error', error => {
  gatewayLogger.warn('Gateway Redis client error', { error: error?.message });
});

export const closeGatewayRedis = async () => {
  if (gatewayRedis.status === 'end') {
    return;
  }

  try {
    await gatewayRedis.quit();
  } catch {
    gatewayRedis.disconnect();
  }
};
