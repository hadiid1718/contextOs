import axiosInstance from '../lib/axios';

const fallbackPlans = {
  plans: [
    {
      id: 'free',
      label: 'Free',
      monthlyPriceUsd: 0,
      annualPriceUsd: 0,
      annualAvailable: true,
      annualSavingsPercent: 0,
      aiQueryLimit: 100,
      maxUsers: 5,
      cta: 'current',
    },
    {
      id: 'pro',
      label: 'Pro',
      monthlyPriceUsd: 49,
      annualPriceUsd: 490,
      annualAvailable: true,
      annualSavingsPercent: 17,
      aiQueryLimit: 5000,
      maxUsers: 5,
      cta: 'checkout',
    },
    {
      id: 'enterprise',
      label: 'Enterprise',
      monthlyPriceUsd: null,
      annualPriceUsd: null,
      annualAvailable: false,
      annualSavingsPercent: 0,
      aiQueryLimit: 0,
      maxUsers: 0,
      cta: 'contact',
    },
  ],
};

const billingService = {
  getPlans: async () => {
    try {
      const { data } = await axiosInstance.get('/billing/plans');
      return data;
    } catch (error) {
      if (error?.response?.status === 404) {
        return fallbackPlans;
      }

      throw error;
    }
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
    try {
      const { data } = await axiosInstance.post('/billing/checkout/pro', payload);
      return data;
    } catch (error) {
      if (error?.response?.status === 404) {
        const { data } = await axiosInstance.post('/billing/checkout', payload);
        return data;
      }

      throw error;
    }
  },

  createPortalSession: async (payload) => {
    const { data } = await axiosInstance.post('/billing/portal', payload);
    return data;
  },
};

export default billingService;

