import axiosInstance from '../lib/axios';

const gatewayService = {
  health: async () => {
    const { data } = await axiosInstance.get('/gateway/health');
    return data;
  },
};

export default gatewayService;

