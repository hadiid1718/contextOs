import { env } from '../../config/env.js';

const withoutTrailingSlash = value => String(value || '').replace(/\/+$/, '');

const asServiceUrl = value => withoutTrailingSlash(value);

export const upstreamServices = Object.freeze({
  auth: asServiceUrl(env.authServiceUrl),
  ingestion: asServiceUrl(env.ingestionServiceUrl),
  graph: asServiceUrl(env.graphServiceUrl),
  query: asServiceUrl(env.queryServiceUrl),
  notification: asServiceUrl(env.notificationServiceUrl),
  billing: asServiceUrl(env.billingServiceUrl),
});

export const gatewayProxyRoutes = [
  {
    name: 'auth',
    path: '/api/v1/auth',
    target: upstreamServices.auth,
    requiresAuth: false,
    rateLimit: false,
  },
  {
    name: 'ingestion-webhooks',
    path: '/api/v1/webhooks',
    target: upstreamServices.ingestion,
    requiresAuth: false,
    rateLimit: false,
  },
  {
    name: 'ingestion',
    path: '/api/v1/credentials',
    target: upstreamServices.ingestion,
    requiresAuth: true,
    rateLimit: true,
  },
  {
    name: 'graph',
    path: '/api/v1/graph',
    target: upstreamServices.graph,
    requiresAuth: true,
    rateLimit: true,
  },
  {
    name: 'query',
    path: '/api/v1/query',
    target: upstreamServices.query,
    requiresAuth: true,
    rateLimit: true,
    rewritePath: '^/api/v1/query',
    rewriteTarget: '/api/v1/ai',
  },
  {
    name: 'query-alias',
    path: '/api/v1/ai',
    target: upstreamServices.query,
    requiresAuth: true,
    rateLimit: true,
  },
  {
    name: 'notification',
    path: '/api/v1/notifications',
    target: upstreamServices.notification,
    requiresAuth: true,
    rateLimit: true,
  },
  {
    name: 'billing',
    path: '/api/v1/billing',
    target: upstreamServices.billing,
    requiresAuth: true,
    rateLimit: true,
  },
];

export const readinessTargets = [
  { name: 'auth', url: upstreamServices.auth },
  { name: 'ingestion', url: upstreamServices.ingestion },
  { name: 'graph', url: upstreamServices.graph },
  { name: 'query', url: upstreamServices.query },
  { name: 'notification', url: upstreamServices.notification },
  { name: 'billing', url: upstreamServices.billing },
];
