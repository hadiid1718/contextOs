import crypto from 'node:crypto';

import { env } from '../../config/env.js';
import logger from '../../config/loggers.js';
import { gatewayRedis } from '../services/redisClient.js';

const gatewayLogger = logger.child({ service: 'contextos-api-gateway' });

const getOrgId = req => {
  if (req.orgId) {
    return req.orgId;
  }

  const headerOrgId = req.headers['x-org-id'];
  if (Array.isArray(headerOrgId)) {
    return headerOrgId[0];
  }

  return headerOrgId || req.auth?.org_id || req.auth?.orgId || null;
};

export const createOrgSlidingWindowRateLimiter = ({
  redisClient,
  limit,
  windowMs,
  keyPrefix,
}) => {
  return async (req, res, next) => {
    const orgId = getOrgId(req);

    if (!orgId) {
      return next();
    }

    const now = Date.now();
    const key = `${keyPrefix}:${orgId}`;
    const memberKey = `${now}-${crypto.randomUUID()}`;

    try {
      if (redisClient.status === 'wait') {
        await redisClient.connect();
      }

      const results = await redisClient
        .multi()
        .zremrangebyscore(key, 0, now - windowMs)
        .zadd(key, now, memberKey)
        .zcard(key)
        .pexpire(key, windowMs + 1000)
        .exec();

      const countResult = results?.[2]?.[1];
      const count = Number(countResult || 0);
      const remaining = Math.max(0, limit - count);

      res.setHeader('X-RateLimit-Limit', String(limit));
      res.setHeader('X-RateLimit-Remaining', String(remaining));

      if (count > limit) {
        const retryAfterSeconds = Math.ceil(windowMs / 1000);
        res.setHeader('Retry-After', String(retryAfterSeconds));

        return res.status(429).json({
          message: 'Rate limit exceeded for organisation',
          orgId,
          limit,
          windowMs,
        });
      }

      return next();
    } catch (error) {
      gatewayLogger.warn('Redis rate limit check failed; allowing request', {
        error: error?.message,
        orgId,
      });
      return next();
    }
  };
};

export const orgRateLimiter = createOrgSlidingWindowRateLimiter({
  redisClient: gatewayRedis,
  limit: env.gatewayRateLimitPerMinute,
  windowMs: env.gatewayRateLimitWindowMs,
  keyPrefix: env.gatewayRateLimitPrefix,
});
