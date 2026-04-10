import axiosInstance from '../lib/axios';

const queryService = {
  run: async (payload) => {
    const { data } = await axiosInstance.post('/ai/query', payload);
    return data;
  },
};

export default queryService;

