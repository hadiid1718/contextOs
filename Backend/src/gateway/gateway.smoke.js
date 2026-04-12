import { gatewayProxyRoutes, readinessTargets } from './config/upstreams.js';

const output = {
  service: 'stackmind-api-gateway',
  routes: gatewayProxyRoutes.map(route => ({
    name: route.name,
    path: route.path,
    target: route.target,
    requiresAuth: route.requiresAuth,
  })),
  readinessTargets,
};

console.log(JSON.stringify(output, null, 2));
