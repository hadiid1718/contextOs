import { create } from 'zustand';
import adminService from '../services/adminService';

const initialSnapshot = {
  goldenSignals: {
    reqPerMin: 0,
    errorRate: 0,
    p95Latency: 0,
    activeOrgs: 0,
    history: [],
  },
  serviceHealth: [],
  orgRateLimits: [],
  kafkaLag: [],
  redisStats: {
    hitRate: 0,
    memUsedGb: 0,
    memTotalGb: 1,
    ttlAvg: 0,
  },
  logEntries: [],
  alerts: [],
  podCounts: {},
  logsMeta: {
    total: 0,
    limit: 50,
    offset: 0,
  },
};

const useAdminStore = create((set, get) => ({
  ...initialSnapshot,
  isRefreshing: false,
  error: null,
  lastUpdated: 0,
  logQuery: '',
  logPaused: false,

  setLogQuery: (logQuery) => set({ logQuery }),
  setLogPaused: (logPaused) => set({ logPaused }),

  refreshData: async () => {
    const { logQuery, logsMeta } = get();

    set({ isRefreshing: true, error: null });

    try {
      const [goldenSignals, serviceHealth, orgRateLimits, kafkaLag, redisStats, logs, podCounts, alerts] =
        await Promise.all([
          adminService.getGoldenSignals(),
          adminService.getServiceHealth(),
          adminService.getOrgRateLimits(),
          adminService.getKafkaLag(),
          adminService.getRedisStats(),
          adminService.getLogs({
            q: logQuery,
            limit: logsMeta?.limit || 50,
            offset: logsMeta?.offset || 0,
          }),
          adminService.getPods(),
          adminService.getAlerts(),
        ]);

      set({
        goldenSignals: {
          ...initialSnapshot.goldenSignals,
          ...(goldenSignals || {}),
          history: Array.isArray(goldenSignals?.history) ? goldenSignals.history : [],
        },
        serviceHealth: Array.isArray(serviceHealth) ? serviceHealth : [],
        orgRateLimits: Array.isArray(orgRateLimits) ? orgRateLimits : [],
        kafkaLag: Array.isArray(kafkaLag) ? kafkaLag : [],
        redisStats: {
          ...initialSnapshot.redisStats,
          ...(redisStats || {}),
        },
        logEntries: Array.isArray(logs?.entries) ? logs.entries : [],
        alerts: Array.isArray(alerts) ? alerts : [],
        podCounts: podCounts && typeof podCounts === 'object' ? podCounts : {},
        logsMeta: {
          total: Number(logs?.total || 0),
          limit: Number(logs?.limit || logsMeta?.limit || 50),
          offset: Number(logs?.offset || logsMeta?.offset || 0),
        },
        isRefreshing: false,
        error: null,
        lastUpdated: Date.now(),
      });
    } catch (error) {
      set({
        isRefreshing: false,
        error:
          error?.response?.data?.message ||
          error?.message ||
          'Unable to refresh admin dashboard data.',
        lastUpdated: Date.now(),
      });
    }
  },
}));

export default useAdminStore;
