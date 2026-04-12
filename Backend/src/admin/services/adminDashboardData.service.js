import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { Kafka } from 'kafkajs';

import { env } from '../../config/env.js';
import { getGraphStatus } from '../../config/graphStatus.js';
import { getIngestionStatus } from '../../config/ingestionStatus.js';
import { Organisation } from '../../models/Organisation.js';
import { Notification } from '../../notifications/models/Notification.js';
import { runReadinessChecks } from '../../gateway/services/health.service.js';
import { gatewayRedis } from '../../gateway/services/redisClient.js';
import { AdminAuditLog } from '../models/AdminAuditLog.js';

const DASHBOARD_SERVICES = [
  'auth',
  'org',
  'ingestion',
  'graph',
  'query',
  'notif',
  'billing',
  'gateway',
];

const SERVICE_MAP = {
  auth: 'auth',
  ingestion: 'ingestion',
  graph: 'graph',
  query: 'query',
  notification: 'notif',
  billing: 'billing',
  admin: 'org',
};

const LOG_CACHE_TTL_MS = 5_000;
const SERVICE_HEALTH_CACHE_TTL_MS = 5_000;
const KAFKA_LAG_CACHE_TTL_MS = 10_000;
const MAX_LOG_LINES_TO_PARSE = 6_000;

const requestLogCache = {
  at: 0,
  entries: [],
};

const serviceHealthCache = {
  at: 0,
  entries: [],
};

const kafkaLagCache = {
  at: 0,
  entries: [],
};

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const toBigInt = value => {
  try {
    const parsed = BigInt(value);
    return parsed < 0n ? 0n : parsed;
  } catch {
    return 0n;
  }
};

const toLagStatus = lag => {
  if (lag > 5000) return 'critical';
  if (lag > 1000) return 'warning';
  return 'healthy';
};

const toServiceStatus = ({ healthy, latencyMs }) => {
  if (!healthy) return 'down';
  if (latencyMs > 500) return 'slow';
  return 'nominal';
};

const toRateFlag = pct => {
  if (pct >= 90) return '429';
  if (pct >= 80) return 'watch';
  return 'ok';
};

const inferServiceFromPath = route => {
  const pathValue = String(route || '').toLowerCase();

  if (pathValue.startsWith('/api/v1/auth')) return 'auth';
  if (pathValue.startsWith('/api/v1/credentials') || pathValue.startsWith('/api/v1/webhooks')) {
    return 'ingestion';
  }
  if (pathValue.startsWith('/api/v1/graph')) return 'graph';
  if (pathValue.startsWith('/api/v1/query') || pathValue.startsWith('/api/v1/ai')) return 'query';
  if (pathValue.startsWith('/api/v1/notifications')) return 'notif';
  if (pathValue.startsWith('/api/v1/billing')) return 'billing';
  if (pathValue.startsWith('/api/v1/admin')) return 'org';

  return 'gateway';
};

const parseJsonLogLine = line => {
  try {
    const parsed = JSON.parse(line);
    if (
      parsed?.service !== 'stackmind-api-gateway' ||
      parsed?.message !== 'http_request'
    ) {
      return null;
    }

    const tsMs = Number.isFinite(Date.parse(parsed.timestamp))
      ? Date.parse(parsed.timestamp)
      : Date.now();

    return {
      tsMs,
      ts: new Date(tsMs).toISOString(),
      method: String(parsed.method || 'GET').toUpperCase(),
      path: String(parsed.path || '/'),
      status: toNumber(parsed.status, 0),
      responseTimeMs: toNumber(parsed.responseTimeMs, 0),
      correlationId: String(parsed.correlationId || '-'),
      orgId: String(parsed.orgId || 'global'),
    };
  } catch {
    return null;
  }
};

const readGatewayRequestEntries = async () => {
  const now = Date.now();
  if (now - requestLogCache.at < LOG_CACHE_TTL_MS) {
    return requestLogCache.entries;
  }

  try {
    const logFilePath = path.resolve(process.cwd(), 'logs', 'combined.log');
    const content = await readFile(logFilePath, 'utf8');

    const entries = content
      .split('\n')
      .slice(-MAX_LOG_LINES_TO_PARSE)
      .map(parseJsonLogLine)
      .filter(Boolean)
      .sort((a, b) => a.tsMs - b.tsMs);

    requestLogCache.at = now;
    requestLogCache.entries = entries;
    return entries;
  } catch {
    requestLogCache.at = now;
    requestLogCache.entries = [];
    return [];
  }
};

const buildRequestsHistory = (entries, nowMs) => {
  const buckets = [];

  for (let i = 11; i >= 0; i -= 1) {
    const bucketStart = nowMs - (i + 1) * 60_000;
    const bucketEnd = nowMs - i * 60_000;
    let count = 0;

    for (const entry of entries) {
      if (entry.tsMs >= bucketStart && entry.tsMs < bucketEnd) {
        count += 1;
      }
    }

    buckets.push(count);
  }

  return buckets;
};

const computeP95 = values => {
  if (!Array.isArray(values) || values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.max(0, Math.ceil(sorted.length * 0.95) - 1);
  return Math.round(sorted[index]);
};

const buildServiceLatencySpark = entries => {
  const map = new Map();

  for (const service of DASHBOARD_SERVICES) {
    map.set(service, []);
  }

  for (const entry of entries) {
    const service = inferServiceFromPath(entry.path);
    const values = map.get(service) || [];
    values.push(entry.responseTimeMs);
    map.set(service, values.slice(-10));
  }

  return map;
};

const pingGateway = async () => {
  const startedAt = Date.now();

  try {
    const response = await fetch(
      `http://127.0.0.1:${env.gatewayPort}/health?probe=liveness`,
      {
        method: 'GET',
        signal: AbortSignal.timeout(env.gatewayUpstreamTimeoutMs),
      }
    );

    return {
      healthy: response.ok,
      latencyMs: Math.max(1, Date.now() - startedAt),
    };
  } catch {
    return {
      healthy: false,
      latencyMs: Math.max(1, Date.now() - startedAt),
    };
  }
};

const buildServiceHealthRows = async () => {
  const now = Date.now();
  if (now - serviceHealthCache.at < SERVICE_HEALTH_CACHE_TTL_MS) {
    return serviceHealthCache.entries;
  }

  const [readiness, gatewayHealth, requestEntries] = await Promise.all([
    runReadinessChecks('admin-dashboard-readiness'),
    pingGateway(),
    readGatewayRequestEntries(),
  ]);

  const graphStatus = getGraphStatus();
  const ingestionStatus = getIngestionStatus();

  const readinessByService = new Map();

  for (const check of readiness.services || []) {
    const mappedService = SERVICE_MAP[check.name];
    if (!mappedService) continue;

    readinessByService.set(mappedService, {
      healthy: Boolean(check.healthy),
      latencyMs: toNumber(check.latencyMs, 0),
    });
  }

  readinessByService.set('gateway', {
    healthy: Boolean(gatewayHealth.healthy),
    latencyMs: toNumber(gatewayHealth.latencyMs, 0),
  });

  const sparkByService = buildServiceLatencySpark(requestEntries);

  const rows = DASHBOARD_SERVICES.map(service => {
    const base = readinessByService.get(service) || {
      healthy: false,
      latencyMs: 0,
    };

    if (service === 'graph') {
      base.healthy =
        base.healthy &&
        graphStatus.enabled !== false &&
        !graphStatus.startupError;
    }

    if (service === 'ingestion') {
      base.healthy =
        base.healthy &&
        ingestionStatus.enabled !== false &&
        !ingestionStatus.startupError;
    }

    const sparkData = sparkByService.get(service) || [];
    const fallbackLatency = sparkData.length ? sparkData[sparkData.length - 1] : 0;
    const latencyMs = Math.max(0, Math.round(base.latencyMs || fallbackLatency));

    return {
      id: service,
      name: service,
      latencyMs,
      status: toServiceStatus({ healthy: base.healthy, latencyMs }),
      uptime: base.healthy ? '100.00%' : '0.00%',
      sparkData,
    };
  });

  serviceHealthCache.at = now;
  serviceHealthCache.entries = rows;

  return rows;
};

const ensureRedisConnection = async () => {
  if (gatewayRedis.status === 'wait') {
    await gatewayRedis.connect();
  }
};

const scanRedisKeys = async pattern => {
  const keys = [];
  let cursor = '0';

  do {
    const result = await gatewayRedis.scan(cursor, 'MATCH', pattern, 'COUNT', '100');
    cursor = result[0];
    keys.push(...result[1]);

    if (keys.length >= 1500) {
      break;
    }
  } while (cursor !== '0');

  return keys;
};

const parseRedisInfo = raw => {
  const map = new Map();

  for (const line of String(raw || '').split('\n')) {
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf(':');
    if (separator < 0) continue;

    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    map.set(key, value);
  }

  return map;
};

const computeKafkaLag = async ({ topic, groupId }) => {
  const kafka = new Kafka({
    clientId: `${env.kafkaClientId}-admin-dashboard`,
    brokers: env.kafkaBrokers,
  });

  const admin = kafka.admin();

  try {
    await admin.connect();

    const [topicOffsets, groupOffsets] = await Promise.all([
      admin.fetchTopicOffsets(topic),
      admin.fetchOffsets({ groupId, topic }),
    ]);

    const committedByPartition = new Map(
      (groupOffsets || []).map(offset => [Number(offset.partition), toBigInt(offset.offset)])
    );

    let lag = 0n;

    for (const offset of topicOffsets || []) {
      const partition = Number(offset.partition);
      const highWatermark = toBigInt(offset.offset);
      const committedOffset = committedByPartition.get(partition) || 0n;

      if (highWatermark > committedOffset) {
        lag += highWatermark - committedOffset;
      }
    }

    const safe = lag > BigInt(Number.MAX_SAFE_INTEGER) ? BigInt(Number.MAX_SAFE_INTEGER) : lag;
    return Number(safe);
  } finally {
    try {
      await admin.disconnect();
    } catch {
      // ignore disconnect errors from best-effort telemetry
    }
  }
};

const buildGatewayLogRows = entries =>
  entries.slice(-400).map((entry, index) => {
    const status = toNumber(entry.status, 0);
    const isServerError = status >= 500;
    const isRateLimited = status === 429;
    const isSlow = toNumber(entry.responseTimeMs, 0) >= 1_200;

    return {
      ts: entry.ts,
      corrId:
        entry.correlationId && entry.correlationId !== '-'
          ? entry.correlationId
          : `gw-${String(index + 1).padStart(6, '0')}`,
      message: `${entry.method} ${entry.path} -> ${status}`,
      org: entry.orgId && entry.orgId !== '-' ? entry.orgId : 'global',
      route: entry.path,
      tag: isServerError ? 'sec' : isRateLimited ? '429' : isSlow ? 'slow' : 'ok',
    };
  });

const buildAuditLogRows = audits =>
  audits.map(audit => {
    const action = String(audit.action || '').toLowerCase();
    const tag =
      action.includes('failed') || action.includes('locked')
        ? 'sec'
        : action.includes('export')
          ? 'slow'
          : 'ok';

    return {
      ts: new Date(audit.ts || Date.now()).toISOString(),
      corrId: `audit-${String(audit._id)}`,
      message: `admin ${audit.action}`,
      org: audit.meta?.orgId || 'admin',
      route: '/api/v1/admin',
      tag,
    };
  });

export const getGoldenSignalsData = async () => {
  const [requestEntries, activeOrgs] = await Promise.all([
    readGatewayRequestEntries(),
    Organisation.countDocuments({ status: 'active' }),
  ]);

  const now = Date.now();
  const history = buildRequestsHistory(requestEntries, now);
  const reqPerMin = history.length ? history[history.length - 1] : 0;

  const minuteWindowStart = now - 60_000;
  const lastMinute = requestEntries.filter(entry => entry.tsMs >= minuteWindowStart);
  const errorCount = lastMinute.filter(entry => toNumber(entry.status, 0) >= 400).length;
  const errorRate =
    lastMinute.length > 0
      ? Number(((errorCount / lastMinute.length) * 100).toFixed(2))
      : 0;

  const fiveMinuteStart = now - 5 * 60_000;
  const latencyWindow = requestEntries
    .filter(entry => entry.tsMs >= fiveMinuteStart)
    .map(entry => toNumber(entry.responseTimeMs, 0));

  return {
    reqPerMin,
    errorRate,
    p95Latency: computeP95(latencyWindow),
    activeOrgs: toNumber(activeOrgs, 0),
    history,
  };
};

export const getServiceHealthData = async () => buildServiceHealthRows();

export const getOrgRateLimitsData = async () => {
  const limit = Math.max(1, toNumber(env.gatewayRateLimitPerMinute, 1));
  const keyPrefix = `${env.gatewayRateLimitPrefix}:`;

  try {
    await ensureRedisConnection();

    const keys = await scanRedisKeys(`${keyPrefix}*`);
    const sortedKeys = [...new Set(keys)].sort();

    const zcardPipeline = gatewayRedis.pipeline();
    for (const key of sortedKeys) {
      zcardPipeline.zcard(key);
    }

    const zcardResults = sortedKeys.length
      ? await zcardPipeline.exec()
      : [];

    const orgIds = sortedKeys
      .map(key => key.slice(keyPrefix.length))
      .filter(Boolean);

    let organisations = [];
    if (orgIds.length) {
      organisations = await Organisation.find(
        { org_id: { $in: orgIds } },
        { org_id: 1, name: 1, _id: 0 }
      ).lean();
    }

    const orgNameById = new Map(
      organisations.map(org => [org.org_id, org.name || org.org_id])
    );

    const rows = sortedKeys.map((key, index) => {
      const orgId = key.slice(keyPrefix.length);
      const reqPerMin = toNumber(zcardResults[index]?.[1], 0);
      const pct = Number(((reqPerMin / limit) * 100).toFixed(1));

      return {
        orgId,
        name: orgNameById.get(orgId) || orgId,
        reqPerMin,
        limit,
        pct,
        flag: toRateFlag(pct),
      };
    });

    if (rows.length > 0) {
      return rows.sort((a, b) => b.pct - a.pct).slice(0, 10);
    }
  } catch {
    // Ignore telemetry errors and fall through to DB-backed fallback.
  }

  const fallbackOrgs = await Organisation.find(
    { status: 'active' },
    { org_id: 1, name: 1, _id: 0 }
  )
    .sort({ updatedAt: -1 })
    .limit(10)
    .lean();

  return fallbackOrgs.map(org => ({
    orgId: org.org_id,
    name: org.name,
    reqPerMin: 0,
    limit,
    pct: 0,
    flag: 'ok',
  }));
};

export const getKafkaLagData = async () => {
  const now = Date.now();
  if (now - kafkaLagCache.at < KAFKA_LAG_CACHE_TTL_MS) {
    return kafkaLagCache.entries;
  }

  const graphStatus = getGraphStatus();
  const ingestionStatus = getIngestionStatus();

  const [graphLagResult, unreadNotifications] = await Promise.all([
    (async () => {
      if (env.graphMockKafka || env.mockKafka) {
        return 0;
      }

      try {
        return await computeKafkaLag({
          topic: env.graphKafkaTopic,
          groupId: env.graphConsumerGroupId,
        });
      } catch {
        return null;
      }
    })(),
    Notification.countDocuments({ read: false }),
  ]);

  const ingestionLag = graphLagResult ?? 0;
  const ingestionTopicStatus =
    graphLagResult === null
      ? graphStatus.kafkaConnected && ingestionStatus.kafkaConnected
        ? 'warning'
        : 'critical'
      : toLagStatus(ingestionLag);

  const unreadTopicName =
    env.notificationKafkaTopic === env.graphKafkaTopic
      ? `${env.notificationKafkaTopic}.unread`
      : env.notificationKafkaTopic;

  const topics = [
    {
      topic: env.graphKafkaTopic,
      lag: ingestionLag,
      status: ingestionTopicStatus,
    },
    {
      topic: unreadTopicName,
      lag: toNumber(unreadNotifications, 0),
      status: toLagStatus(toNumber(unreadNotifications, 0)),
    },
  ];

  kafkaLagCache.at = now;
  kafkaLagCache.entries = topics;

  return topics;
};

export const getRedisStatsData = async () => {
  try {
    await ensureRedisConnection();

    const info = await gatewayRedis.info();
    const parsed = parseRedisInfo(info);

    const hits = toNumber(parsed.get('keyspace_hits'), 0);
    const misses = toNumber(parsed.get('keyspace_misses'), 0);
    const totalLookups = hits + misses;
    const hitRate =
      totalLookups > 0 ? Number(((hits / totalLookups) * 100).toFixed(1)) : 0;

    const usedBytes = toNumber(parsed.get('used_memory'), 0);
    const maxMemoryBytes = toNumber(parsed.get('maxmemory'), 0);
    const systemMemoryBytes = toNumber(parsed.get('total_system_memory'), 0);

    const memTotalBytes =
      maxMemoryBytes > 0 ? maxMemoryBytes : systemMemoryBytes > 0 ? systemMemoryBytes : usedBytes;

    const memUsedGb = Number((usedBytes / (1024 ** 3)).toFixed(2));
    const memTotalGb = Number((Math.max(memTotalBytes, usedBytes) / (1024 ** 3)).toFixed(2));

    const ttlMatches = String(info)
      .split('\n')
      .map(line => {
        const match = line.match(/avg_ttl=(\d+)/);
        return match ? toNumber(match[1], 0) : null;
      })
      .filter(value => value !== null);

    const ttlAvgMs = ttlMatches.length
      ? ttlMatches.reduce((sum, value) => sum + value, 0) / ttlMatches.length
      : 0;

    return {
      hitRate,
      memUsedGb,
      memTotalGb: Math.max(0.01, memTotalGb),
      ttlAvg: Math.round(ttlAvgMs / 1000),
    };
  } catch {
    return {
      hitRate: 0,
      memUsedGb: 0,
      memTotalGb: 1,
      ttlAvg: 0,
    };
  }
};

export const getLogsData = async ({ q = '', limit = 50, offset = 0 } = {}) => {
  const safeLimit = clamp(toNumber(limit, 50), 1, 200);
  const safeOffset = Math.max(0, toNumber(offset, 0));
  const normalizedQuery = String(q || '').trim().toLowerCase();

  const [gatewayEntries, adminAuditLogs] = await Promise.all([
    readGatewayRequestEntries(),
    AdminAuditLog.find({})
      .sort({ ts: -1 })
      .limit(200)
      .lean(),
  ]);

  const rows = [
    ...buildGatewayLogRows(gatewayEntries),
    ...buildAuditLogRows(adminAuditLogs),
  ].sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());

  let filtered = rows;
  if (normalizedQuery) {
    filtered = rows.filter(row => {
      const haystack = `${row.corrId} ${row.org} ${row.route} ${row.message}`;
      return haystack.toLowerCase().includes(normalizedQuery);
    });
  }

  return {
    entries: filtered.slice(safeOffset, safeOffset + safeLimit),
    total: filtered.length,
    limit: safeLimit,
    offset: safeOffset,
  };
};

export const getPodsData = async () => {
  const serviceHealth = await buildServiceHealthRows();

  return serviceHealth.reduce((acc, service) => {
    const desired = 1;
    const ready = service.status === 'down' ? 0 : 1;

    acc[service.name] = {
      desired,
      ready,
      scaling: service.status === 'slow',
    };

    return acc;
  }, {});
};

export const getAlertsData = async () => {
  const [notifications, authAlerts, gatewayEntries] = await Promise.all([
    Notification.find({ severity: { $in: ['warning', 'error'] } })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean(),
    AdminAuditLog.find({ action: { $in: ['login_failed', 'login_locked'] } })
      .sort({ ts: -1 })
      .limit(20)
      .lean(),
    readGatewayRequestEntries(),
  ]);

  const notificationAlerts = notifications.map((item, index) => ({
    id: `notif-${String(item._id || index)}`,
    type: item.type || 'NOTIFICATION',
    severity: item.severity === 'error' ? 'critical' : 'warning',
    title: String(item.type || 'Notification alert')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase()),
    detail: item.message || 'Notification requires review',
    org: item.org_id || 'global',
    ip: item.metadata?.ip || item.metadata?.remoteAddress || '',
    ts: new Date(item.createdAt || Date.now()).toISOString(),
  }));

  const authFailureAlerts = authAlerts.map((item, index) => ({
    id: `auth-${String(item._id || index)}`,
    type: String(item.action || 'AUTH_EVENT').toUpperCase(),
    severity: 'critical',
    title: item.action === 'login_locked' ? 'Admin account temporarily locked' : 'Failed admin login attempt',
    detail: `Admin action ${item.action} detected`,
    org: 'admin',
    ip: item.ip || '',
    ts: new Date(item.ts || Date.now()).toISOString(),
  }));

  const gatewayErrorAlerts = gatewayEntries
    .filter(entry => toNumber(entry.status, 0) >= 500 || toNumber(entry.status, 0) === 429)
    .slice(-10)
    .map((entry, index) => ({
      id: `gw-${entry.tsMs}-${index}`,
      type: toNumber(entry.status, 0) === 429 ? 'RATE_LIMIT' : 'UPSTREAM_ERROR',
      severity: toNumber(entry.status, 0) === 429 ? 'warning' : 'critical',
      title:
        toNumber(entry.status, 0) === 429
          ? 'Rate limiting triggered'
          : 'Gateway upstream error',
      detail: `${entry.method} ${entry.path} returned ${entry.status}`,
      org: entry.orgId && entry.orgId !== '-' ? entry.orgId : 'global',
      ip: '',
      ts: entry.ts,
    }));

  return [...notificationAlerts, ...authFailureAlerts, ...gatewayErrorAlerts]
    .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
    .slice(0, 20);
};
