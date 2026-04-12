import morgan from 'morgan';

import logger from '../../config/loggers.js';

const gatewayLogger = logger.child({ service: 'stackmind-api-gateway' });

morgan.token('correlation-id', req => req.correlationId || '-');
morgan.token(
  'org-id',
  req => req.orgId || req.auth?.org_id || req.auth?.orgId || '-'
);

const stream = {
  write: message => {
    try {
      const payload = JSON.parse(message.trim());
      gatewayLogger.info('http_request', payload);
    } catch {
      gatewayLogger.info(message.trim());
    }
  },
};

export const requestLogger = morgan(
  (tokens, req, res) => {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      method: tokens.method(req, res),
      path: tokens.url(req, res),
      status: Number(tokens.status(req, res) || 0),
      responseTimeMs: Number(tokens['response-time'](req, res) || 0),
      contentLength: Number(tokens.res(req, res, 'content-length') || 0),
      correlationId: tokens['correlation-id'](req, res),
      orgId: tokens['org-id'](req, res),
      remoteAddress: tokens['remote-addr'](req, res),
      userAgent: tokens['user-agent'](req, res),
    });
  },
  { stream }
);
