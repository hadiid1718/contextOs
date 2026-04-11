import { ADMIN_SERVICES } from '../types/admin';

const now = Date.now();

const buildDefaultLogs = () =>
  Array.from({ length: 20 }, (_, index) => ({
    ts: new Date(now - index * 30 * 1000).toISOString(),
    corrId: `corr_${String(index + 1).padStart(6, '0')}`,
    message: `Seeded log row ${index + 1}`,
    org: 'NexaCorp',
    route: '/api/v1/ai/query/stream',
    tag: index % 5 === 0 ? 'slow' : 'ok',
  }));

const buildPodSnapshot = () =>
  ADMIN_SERVICES.reduce((acc, service) => {
    acc[service] = {
      desired: 3,
      ready: 3,
      scaling: false,
    };
    return acc;
  }, {});

export const createAdminFallbackSnapshot = () => ({
  goldenSignals: {
    reqPerMin: 14382,
    errorRate: 1.2,
    p95Latency: 248,
    activeOrgs: 96,
    history: [13720, 13990, 14110, 14280, 14420, 14610, 14540, 14780, 14660, 14810, 14900, 15020],
  },
  serviceHealth: [
    { id: 'auth', name: 'auth', latencyMs: 88, status: 'nominal', uptime: '99.98%', sparkData: [80, 88, 90, 84, 86, 91, 87, 92] },
    { id: 'org', name: 'org', latencyMs: 112, status: 'nominal', uptime: '99.95%', sparkData: [94, 103, 110, 99, 105, 108, 111, 112] },
    { id: 'ingestion', name: 'ingestion', latencyMs: 260, status: 'slow', uptime: '99.74%', sparkData: [220, 238, 245, 252, 261, 269, 258, 264] },
    { id: 'graph', name: 'graph', latencyMs: 190, status: 'nominal', uptime: '99.87%', sparkData: [160, 170, 176, 188, 192, 189, 196, 190] },
    { id: 'query', name: 'query', latencyMs: 320, status: 'slow', uptime: '99.66%', sparkData: [270, 284, 300, 318, 320, 325, 319, 322] },
    { id: 'notif', name: 'notif', latencyMs: 124, status: 'nominal', uptime: '99.91%', sparkData: [101, 108, 117, 120, 124, 122, 126, 123] },
    { id: 'billing', name: 'billing', latencyMs: 174, status: 'nominal', uptime: '99.83%', sparkData: [150, 154, 161, 170, 174, 172, 176, 173] },
  ],
  orgRateLimits: [
    { orgId: 'org_1', name: 'NexaCorp', reqPerMin: 1120, limit: 1200, pct: 93.3, flag: '429' },
    { orgId: 'org_2', name: 'DataVault', reqPerMin: 980, limit: 1200, pct: 81.7, flag: 'watch' },
    { orgId: 'org_3', name: 'PulseAI', reqPerMin: 760, limit: 1200, pct: 63.3, flag: 'ok' },
    { orgId: 'org_4', name: 'OmegaStack', reqPerMin: 700, limit: 1200, pct: 58.3, flag: 'ok' },
    { orgId: 'org_5', name: 'ByteForge', reqPerMin: 1080, limit: 1200, pct: 90, flag: '429' },
    { orgId: 'org_6', name: 'SkyLedger', reqPerMin: 890, limit: 1200, pct: 74.2, flag: 'ok' },
  ],
  kafkaLag: [
    { topic: 'events.ingestion', lag: 820, status: 'healthy' },
    { topic: 'events.graph', lag: 1640, status: 'warning' },
    { topic: 'events.notifications', lag: 420, status: 'healthy' },
    { topic: 'events.analytics', lag: 5820, status: 'critical' },
  ],
  redisStats: {
    hitRate: 94.2,
    memUsedGb: 2.1,
    memTotalGb: 4,
    ttlAvg: 3600,
  },
  logEntries: buildDefaultLogs(),
  alerts: [
    { id: 'AUTH_BURST', type: 'AUTH_BURST', severity: 'critical', title: 'Failed login spike', detail: 'Burst of invalid logins detected', org: 'NexaCorp', ip: '203.0.113.42', ts: new Date(now - 2 * 60 * 1000).toISOString() },
    { id: 'RATE_SPIKE', type: 'RATE_SPIKE', severity: 'warning', title: 'Request flood', detail: 'Request rate approaching hard limit', org: 'DataVault', ip: '198.51.100.7', ts: new Date(now - 6 * 60 * 1000).toISOString() },
    { id: 'JWT_FLOOD', type: 'JWT_FLOOD', severity: 'warning', title: 'Token refresh storm', detail: 'Refresh activity significantly above baseline', org: 'PulseAI', ip: '192.0.2.88', ts: new Date(now - 11 * 60 * 1000).toISOString() },
    { id: 'GEO_ANOMALY', type: 'GEO_ANOMALY', severity: 'warning', title: 'Login from unusual region', detail: 'Location mismatch from known office ranges', org: 'OmegaStack', ip: '198.51.100.91', ts: new Date(now - 15 * 60 * 1000).toISOString() },
    { id: 'BRUTE_FORCE', type: 'BRUTE_FORCE', severity: 'critical', title: 'Credential stuffing detected', detail: 'Automated password spray blocked', org: 'ByteForge', ip: '203.0.113.83', ts: new Date(now - 20 * 60 * 1000).toISOString() },
  ],
  podCounts: buildPodSnapshot(),
  logsMeta: {
    total: 20,
    limit: 50,
    offset: 0,
  },
});
