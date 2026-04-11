import adminAxios from '../lib/adminAxios';

const adminService = {
  login: async (payload) => {
    const { data } = await adminAxios.post('/admin/auth/login', payload);
    return data;
  },

  logout: async () => {
    const { data } = await adminAxios.post('/admin/auth/logout', {});
    return data;
  },

  me: async () => {
    const { data } = await adminAxios.get('/admin/auth/me');
    return data;
  },

  getGoldenSignals: async () => {
    const { data } = await adminAxios.get('/admin/golden-signals');
    return data;
  },

  getServiceHealth: async () => {
    const { data } = await adminAxios.get('/admin/service-health');
    return data;
  },

  getOrgRateLimits: async () => {
    const { data } = await adminAxios.get('/admin/orgs/rate-limits');
    return data;
  },

  getKafkaLag: async () => {
    const { data } = await adminAxios.get('/admin/kafka/lag');
    return data;
  },

  getRedisStats: async () => {
    const { data } = await adminAxios.get('/admin/redis/stats');
    return data;
  },

  getLogs: async ({ q = '', limit = 50, offset = 0 } = {}) => {
    const { data } = await adminAxios.get('/admin/logs', {
      params: { q, limit, offset },
    });

    return data;
  },

  getPods: async () => {
    const { data } = await adminAxios.get('/admin/pods');
    return data;
  },

  getAlerts: async () => {
    const { data } = await adminAxios.get('/admin/alerts');
    return data;
  },
};

export default adminService;
