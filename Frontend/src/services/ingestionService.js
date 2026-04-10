import axiosInstance from '../lib/axios';

const ingestionService = {
  listIntegrations: async () => {
    const { data } = await axiosInstance.get('/ingestion/integrations');
    return data;
  },
  triggerSync: async (provider) => {
    const { data } = await axiosInstance.post(`/ingestion/providers/${provider}/sync`);
    return data;
  },
};

export default ingestionService;

