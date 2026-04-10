import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';

import { env } from './config/env.js';
import {
  errorHandler,
  notFoundHandler,
} from './middleware/error.middleware.js';
import { attachCorrelationId } from './gateway/middleware/correlationId.middleware.js';
import { requestLogger } from './gateway/middleware/requestLogger.middleware.js';
import { healthRouter } from './gateway/routes/health.routes.js';
import { proxyRouter } from './gateway/routes/proxy.routes.js';

const gatewayApp = express();

gatewayApp.disable('x-powered-by');

gatewayApp.use(attachCorrelationId);
gatewayApp.use(requestLogger);
gatewayApp.use(
  cors({
    origin: env.gatewayCorsOrigin,
    credentials: true,
    exposedHeaders: ['X-Correlation-ID'],
  })
);
gatewayApp.use(express.json());
gatewayApp.use(express.urlencoded({ extended: true }));
gatewayApp.use(cookieParser());

gatewayApp.get('/', (_req, res) => {
  res.status(200).json({
    service: 'contextos-api-gateway',
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

gatewayApp.use(healthRouter);
gatewayApp.use(proxyRouter);

gatewayApp.use(notFoundHandler);
gatewayApp.use(errorHandler);

export { gatewayApp };
