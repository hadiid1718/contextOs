import { create } from 'zustand';
import adminService from '../services/adminService';
import { applyAdminJitter } from '../utils/adminJitter';
import { createAdminFallbackSnapshot } from '../utils/mockData';

const fallbackSnapshot = createAdminFallbackSnapshot();

const useAdminStore = create((set, get) => ({
  ...fallbackSnapshot,
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

      const jittered = applyAdminJitter({
        goldenSignals,
        serviceHealth,
        orgRateLimits,
        kafkaLag,
        redisStats,
        logEntries: logs?.entries || [],
        alerts: alerts || [],
        podCounts: podCounts || {},
        logsMeta: {
          total: logs?.total || 0,
          limit: logs?.limit || 50,
          offset: logs?.offset || 0,
        },
      });

      set({
        ...jittered,
        isRefreshing: false,
        error: null,
        lastUpdated: Date.now(),
      });
    } catch (error) {
      const fallback = applyAdminJitter(createAdminFallbackSnapshot());

      set({
        ...fallback,
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
