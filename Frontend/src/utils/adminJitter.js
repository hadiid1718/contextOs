const jitterNumber = (value, pct = 0.15, min = 0) => {
  const base = Number(value) || 0;
  const drift = 1 + (Math.random() * 2 - 1) * pct;
  return Math.max(min, Math.round(base * drift));
};

const jitterFloat = (value, pct = 0.05, min = 0, precision = 1) => {
  const base = Number(value) || 0;
  const drift = 1 + (Math.random() * 2 - 1) * pct;
  const next = Math.max(min, base * drift);
  return Number(next.toFixed(precision));
};

export const applyAdminJitter = (snapshot) => {
  const next = {
    ...snapshot,
    goldenSignals: {
      ...snapshot.goldenSignals,
      reqPerMin: jitterNumber(snapshot.goldenSignals.reqPerMin, 0.1),
      errorRate: jitterFloat(snapshot.goldenSignals.errorRate, 0.2, 0, 2),
      p95Latency: jitterNumber(snapshot.goldenSignals.p95Latency, 0.15),
      activeOrgs: jitterNumber(snapshot.goldenSignals.activeOrgs, 0.05),
      history: (snapshot.goldenSignals.history || []).map((point) => jitterNumber(point, 0.08)),
    },
    serviceHealth: (snapshot.serviceHealth || []).map((service) => {
      const latencyMs = jitterNumber(service.latencyMs, 0.15, 20);
      let status = service.status;

      if (latencyMs > 650) status = 'down';
      else if (latencyMs > 300) status = 'slow';
      else status = 'nominal';

      return {
        ...service,
        latencyMs,
        status,
      };
    }),
    orgRateLimits: (snapshot.orgRateLimits || []).map((org) => {
      const reqPerMin = jitterNumber(org.reqPerMin, 0.12, 0);
      const limit = Number(org.limit) || 1;
      const pct = Number(((reqPerMin / limit) * 100).toFixed(1));

      return {
        ...org,
        reqPerMin,
        pct,
        flag: pct > 90 ? '429' : pct > 80 ? 'watch' : 'ok',
      };
    }),
    kafkaLag: (snapshot.kafkaLag || []).map((topic) => {
      const lag = jitterNumber(topic.lag, 0.25, 0);
      return {
        ...topic,
        lag,
        status: lag > 5000 ? 'critical' : lag > 1000 ? 'warning' : 'healthy',
      };
    }),
    redisStats: {
      ...snapshot.redisStats,
      hitRate: jitterFloat(snapshot.redisStats.hitRate, 0.02, 70, 1),
      memUsedGb: jitterFloat(snapshot.redisStats.memUsedGb, 0.04, 0.5, 2),
      ttlAvg: jitterNumber(snapshot.redisStats.ttlAvg, 0.1, 120),
    },
    podCounts: { ...(snapshot.podCounts || {}) },
  };

  if (Math.random() < 0.1 && next.serviceHealth.length > 0) {
    const randomService = Math.floor(Math.random() * next.serviceHealth.length);
    const selected = next.serviceHealth[randomService];
    next.serviceHealth[randomService] = {
      ...selected,
      status: 'slow',
      latencyMs: Math.max(selected.latencyMs, 360),
    };
  }

  return next;
};
