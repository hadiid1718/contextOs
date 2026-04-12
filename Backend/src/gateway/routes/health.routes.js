import { Router } from 'express';

import { runReadinessChecks } from '../services/health.service.js';

const healthRouter = Router();

healthRouter.get('/health', async (req, res) => {
  if (req.query?.probe === 'liveness') {
    return res.status(200).json({
      status: 'ok',
      service: 'stackmind-api-gateway',
      probe: 'liveness',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  }

  const readiness = await runReadinessChecks(
    req.correlationId || 'gateway-health-check'
  );

  return res.status(readiness.ready ? 200 : 503).json({
    status: readiness.ready ? 'ok' : 'degraded',
    service: 'stackmind-api-gateway',
    probe: 'readiness',
    liveness: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    readiness,
  });
});

export { healthRouter };
