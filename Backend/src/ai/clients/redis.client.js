import Redis from 'ioredis';

import { env } from '../../config/env.js';
import logger from '../../config/loggers.js';

let redisClient = null;

const redisStatus = {
  enabled: env.aiRedisEnabled,
  connected: false,
  startupError: null,
  updatedAt: new Date().toISOString(),
};

const updateStatus = patch => {
  Object.assign(redisStatus, patch, { updatedAt: new Date().toISOString() });
};

export const getRedisClient = () => {
  if (!env.aiRedisEnabled) {
    return null;
  }

  if (redisClient) {
    return redisClient;
  }

  redisClient = new Redis(env.redisUrl, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
  });

  redisClient.on('ready', () => {
    updateStatus({ connected: true, startupError: null });
  });

  redisClient.on('error', error => {
    logger.warn(`Redis error: ${error.message}`);
    updateStatus({ connected: false, startupError: error.message });
  });

  redisClient.on('end', () => {
    updateStatus({ connected: false });
  });

  return redisClient;
};

export const initializeRedisCache = async () => {
  if (!env.aiRedisEnabled) {
    updateStatus({ enabled: false, connected: false, startupError: null });
    return;
  }

  try {
    const client = getRedisClient();
    await client.connect();
    await client.ping();
    updateStatus({ connected: true, startupError: null });
  } catch (error) {
    logger.warn(`Redis cache startup degraded: ${error.message}`);
    updateStatus({ connected: false, startupError: error.message });
  }
};

export const shutdownRedisCache = async () => {
  if (!redisClient) {
    return;
  }

  try {
    await redisClient.quit();
  } catch {
    redisClient.disconnect();
  }

  redisClient = null;
  updateStatus({ connected: false });
};

export const getRedisCacheStatus = () => ({ ...redisStatus });

