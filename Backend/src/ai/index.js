import {
  getRedisCacheStatus,
  initializeRedisCache,
  shutdownRedisCache,
} from './clients/redis.client.js';

export const initializeAIQueryModule = async () => {
  await initializeRedisCache();
};

export const shutdownAIQueryModule = async () => {
  await shutdownRedisCache();
};

export const getAIQueryStatus = () => getRedisCacheStatus();

