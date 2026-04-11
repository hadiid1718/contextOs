const services = [
  'auth',
  'org',
  'ingestion',
  'graph',
  'query',
  'notif',
  'billing',
];

const orgNames = [
  'NexaCorp',
  'DataVault',
  'PulseAI',
  'OmegaStack',
  'ByteForge',
  'SkyLedger',
  'TerraSignal',
  'HelixGrid',
  'QuartzOps',
  'NovaTensor',
];

const kafkaTopics = [
  'events.ingestion',
  'events.graph',
  'events.notifications',
  'events.analytics',
];

const baseAlerts = [
  {
    id: 'AUTH_BURST',
    type: 'AUTH_BURST',
    severity: 'critical',
    title: 'Failed login spike',
    detail: 'Burst of invalid superadmin and org-admin login attempts',
    org: 'NexaCorp',
    ip: '203.0.113.42',
  },
  {
    id: 'RATE_SPIKE',
    type: 'RATE_SPIKE',
    severity: 'warning',
    title: 'Request flood',
    detail: 'Traffic exceeded expected burst for org API lane',
    org: 'DataVault',
    ip: '198.51.100.7',
  },
  {
    id: 'JWT_FLOOD',
    type: 'JWT_FLOOD',
    severity: 'warning',
    title: 'Token refresh storm',
    detail: 'Rapid refresh token exchanges detected',
    org: 'PulseAI',
    ip: '192.0.2.88',
  },
  {
    id: 'GEO_ANOMALY',
    type: 'GEO_ANOMALY',
    severity: 'warning',
    title: 'Login from unusual region',
    detail: 'Geo profile deviates from baseline pattern',
    org: 'OmegaStack',
    ip: '198.51.100.91',
  },
  {
    id: 'BRUTE_FORCE',
    type: 'BRUTE_FORCE',
    severity: 'critical',
    title: 'Credential stuffing detected',
    detail: 'High-volume password spray blocked by edge controls',
    org: 'ByteForge',
    ip: '203.0.113.83',
  },
];

const randomInt = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const randomFloat = (min, max, precision = 2) => {
  const value = Math.random() * (max - min) + min;
  return Number(value.toFixed(precision));
};

const nowIsoMinusMinutes = (minutesAgo) =>
  new Date(Date.now() - minutesAgo * 60 * 1000).toISOString();

const latencyStatus = (latencyMs) => {
  if (latencyMs > 650) return 'down';
  if (latencyMs > 300) return 'slow';
  return 'nominal';
};

const lagStatus = (lag) => {
  if (lag > 5000) return 'critical';
  if (lag > 1000) return 'warning';
  return 'healthy';
};

const pctFlag = (pct) => {
  if (pct >= 90) return '429';
  if (pct >= 80) return 'watch';
  return 'ok';
};

const buildSparkData = (count, min = 20, max = 120) =>
  Array.from({ length: count }, () => randomInt(min, max));

const buildGoldenSignals = () => {
  const reqPerMin = randomInt(13200, 15700);
  const errorRate = randomFloat(0.4, 3.8, 2);
  const p95Latency = randomInt(120, 720);
  const activeOrgs = randomInt(80, 150);

  return {
    reqPerMin,
    errorRate,
    p95Latency,
    activeOrgs,
    history: buildSparkData(12, 11000, 16200),
  };
};

const buildServiceHealth = () =>
  services.map((name) => {
    const latencyMs = randomInt(70, 760);

    return {
      id: name,
      name,
      latencyMs,
      status: latencyStatus(latencyMs),
      uptime: `${randomFloat(99.4, 99.99, 2)}%`,
      sparkData: buildSparkData(10, 40, 780),
    };
  });

const buildOrgRateLimits = () =>
  orgNames.slice(0, 10).map((name, index) => {
    const limit = 1200 + index * 140;
    const reqPerMin = randomInt(Math.floor(limit * 0.35), Math.floor(limit * 1.05));
    const pct = Number(((reqPerMin / limit) * 100).toFixed(1));

    return {
      orgId: `org_${index + 1}`,
      name,
      reqPerMin,
      limit,
      pct,
      flag: pctFlag(pct),
    };
  });

const buildKafkaLag = () =>
  kafkaTopics.map((topic) => {
    const lag = randomInt(120, 9200);
    return {
      topic,
      lag,
      status: lagStatus(lag),
    };
  });

const buildRedisStats = () => {
  const memTotalGb = 4;
  const memUsedGb = randomFloat(1.4, 3.9, 2);

  return {
    hitRate: randomFloat(89.5, 98.9, 1),
    memUsedGb,
    memTotalGb,
    ttlAvg: randomInt(1800, 5400),
  };
};

let logSequence = 0;
const buildLogPool = () => {
  const tags = ['ok', 'slow', 'sec', '429'];
  const routes = [
    '/api/v1/auth/login',
    '/api/v1/graph/search',
    '/api/v1/ai/query/stream',
    '/api/v1/notifications/publish',
    '/api/v1/billing/usage/ai-query',
  ];

  return Array.from({ length: 120 }, (_, index) => {
    logSequence += 1;
    const tag = tags[randomInt(0, tags.length - 1)];
    const org = orgNames[randomInt(0, orgNames.length - 1)];
    const route = routes[randomInt(0, routes.length - 1)];
    const corrId = `corr_${String(logSequence).padStart(6, '0')}`;

    return {
      ts: nowIsoMinusMinutes(index),
      corrId,
      message: `${route} processed for ${org}`,
      org,
      route,
      tag,
    };
  });
};

const buildPods = () => {
  const podServices = ['auth', 'org', 'ingestion', 'graph', 'query', 'notif', 'billing', 'gateway'];
  const pods = {};

  podServices.forEach((name) => {
    const desired = randomInt(2, 5);
    const ready = Math.max(0, desired - randomInt(0, 1));
    const scaling = desired !== ready || Math.random() < 0.2;

    pods[name] = {
      desired,
      ready,
      scaling,
    };
  });

  return pods;
};

const buildAlerts = () =>
  baseAlerts
    .map((alert, index) => ({
      ...alert,
      ts: nowIsoMinusMinutes(index * 6 + randomInt(1, 4)),
    }))
    .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());

export const getGoldenSignalsData = () => buildGoldenSignals();
export const getServiceHealthData = () => buildServiceHealth();
export const getOrgRateLimitsData = () => buildOrgRateLimits();
export const getKafkaLagData = () => buildKafkaLag();
export const getRedisStatsData = () => buildRedisStats();
export const getPodsData = () => buildPods();
export const getAlertsData = () => buildAlerts();

export const getLogsData = ({ q = '', limit = 50, offset = 0 }) => {
  const normalized = String(q || '').trim().toLowerCase();
  const pool = buildLogPool();

  let filtered = pool;
  if (normalized) {
    filtered = pool.filter((row) =>
      `${row.corrId} ${row.org} ${row.route} ${row.message}`
        .toLowerCase()
        .includes(normalized)
    );
  }

  const safeOffset = Math.max(0, Number(offset) || 0);
  const safeLimit = Math.min(200, Math.max(1, Number(limit) || 50));

  return {
    entries: filtered.slice(safeOffset, safeOffset + safeLimit),
    total: filtered.length,
    limit: safeLimit,
    offset: safeOffset,
  };
};
