import axiosInstance from '../lib/axios';

const billingService = {
  getSubscription: async () => {
    const { data } = await axiosInstance.get('/billing/subscription');
    return data;
  },
  createCheckoutSession: async (payload) => {
    const { data } = await axiosInstance.post('/billing/checkout', payload);
    return data;
  },
};

export default billingService;

