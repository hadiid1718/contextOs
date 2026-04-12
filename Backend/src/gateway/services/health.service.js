import { env } from '../../config/env.js';
import { readinessTargets } from '../config/upstreams.js';

const toHealthUrl = baseUrl =>
  `${String(baseUrl || '').replace(/\/+$/, '')}/health`;

const checkService = async ({ name, url }, correlationId) => {
  const healthUrl = toHealthUrl(url);
  const startedAt = Date.now();

  try {
    const response = await fetch(healthUrl, {
      method: 'GET',
      headers: {
        'X-Correlation-ID': correlationId,
      },
      signal: AbortSignal.timeout(env.gatewayUpstreamTimeoutMs),
    });

    return {
      name,
      url,
      healthy: response.ok,
      statusCode: response.status,
      latencyMs: Math.max(1, Date.now() - startedAt),
    };
  } catch (error) {
    return {
      name,
      url,
      healthy: false,
      error: error?.message || 'Health check failed',
      latencyMs: Math.max(1, Date.now() - startedAt),
    };
  }
};

export const runReadinessChecks = async correlationId => {
  const checks = await Promise.all(
    readinessTargets.map(target => checkService(target, correlationId))
  );

  const ready = checks.every(check => check.healthy);

  return {
    ready,
    services: checks,
  };
};
