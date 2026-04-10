import axiosInstance from '../lib/axios';

const ingestionService = {
  listIntegrations: async () => {
    const { data } = await axiosInstance.get('/credentials');
    return data;
  },
  saveIntegration: async (provider, payload) => {
    const { data } = await axiosInstance.put(`/credentials/${provider}`, payload);
    return data;
  },
  removeIntegration: async (provider) => {
    const { data } = await axiosInstance.delete(`/credentials/${provider}`);
    return data;
  },
};

export default ingestionService;

