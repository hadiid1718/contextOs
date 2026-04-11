import axiosInstance from '../lib/axios';

const billingService = {
  getPlans: async () => {
    const { data } = await axiosInstance.get('/billing/plans');
    return data;
  },

  getSubscription: async (orgId) => {
    const { data } = await axiosInstance.get(`/billing/subscriptions/${orgId}`);
    return data;
  },

  getUsage: async (orgId) => {
    const { data } = await axiosInstance.get(`/billing/usage/${orgId}`);
    return data;
  },

  getInvoices: async (orgId, limit = 20) => {
    const { data } = await axiosInstance.get(`/billing/invoices/${orgId}`, {
      params: { limit },
    });
    return data;
  },

  createCheckoutSession: async (payload) => {
    const { data } = await axiosInstance.post('/billing/checkout/pro', payload);
    return data;
  },

  createPortalSession: async (payload) => {
    const { data } = await axiosInstance.post('/billing/portal', payload);
    return data;
  },
};

export default billingService;

