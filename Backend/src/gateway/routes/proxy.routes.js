import { Router } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

import logger from '../../config/loggers.js';
import { gatewayProxyRoutes } from '../config/upstreams.js';
import { requireGatewayAuth } from '../middleware/auth.middleware.js';
import { orgRateLimiter } from '../middleware/orgRateLimit.middleware.js';

const gatewayLogger = logger.child({ service: 'contextos-api-gateway' });

const writeJsonBodyForProxy = (proxyReq, req) => {
  if (!req.body || !Object.keys(req.body).length) {
    return;
  }

  const contentType = proxyReq.getHeader('Content-Type');
  const isJson =
    typeof contentType === 'string' && contentType.includes('application/json');

  if (!isJson) {
    return;
  }

  const bodyData = JSON.stringify(req.body);
  proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
  proxyReq.write(bodyData);
};

const buildProxyMiddleware = route => {
  const pathRewrite =
    route.rewritePath && route.rewriteTarget
      ? { [route.rewritePath]: route.rewriteTarget }
      : undefined;

  return createProxyMiddleware({
    target: route.target,
    changeOrigin: true,
    xfwd: true,
    pathRewrite,
    proxyTimeout: 10000,
    onProxyReq: (proxyReq, req) => {
      proxyReq.setHeader(
        'X-Correlation-ID',
        req.correlationId || 'gateway-unknown'
      );

      if (req.userId) {
        proxyReq.setHeader('X-User-Id', req.userId);
      }

      if (req.orgId) {
        proxyReq.setHeader('X-Org-Id', req.orgId);
      }

      writeJsonBodyForProxy(proxyReq, req);
    },
    onError: (error, req, res) => {
      gatewayLogger.error('Upstream proxy request failed', {
        route: route.path,
        target: route.target,
        method: req.method,
        path: req.originalUrl,
        correlationId: req.correlationId,
        error: error?.message,
      });

      if (res.headersSent) {
        return;
      }

      res.status(502).json({
        message: 'Bad gateway',
        service: route.name,
        correlationId: req.correlationId,
      });
    },
  });
};

const proxyRouter = Router();

gatewayProxyRoutes.forEach(route => {
  const middleware = [];

  if (route.requiresAuth) {
    middleware.push(requireGatewayAuth);
  }

  if (route.rateLimit) {
    middleware.push(orgRateLimiter);
  }

  middleware.push(buildProxyMiddleware(route));
  proxyRouter.use(route.path, ...middleware);
});

export { proxyRouter };
