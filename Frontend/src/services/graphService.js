import axiosInstance from '../lib/axios';

const graphService = {
  getGraph: async (params = {}) => {
    const { data } = await axiosInstance.get('/graph', { params });
    return data;
  },
};

export default graphService;

