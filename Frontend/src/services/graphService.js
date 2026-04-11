import axiosInstance from '../lib/axios';

const graphService = {
  getOverview: async (params = {}) => {
    const { data } = await axiosInstance.get('/graph/overview', { params });
    return data;
  },
  getNode: async (nodeId) => {
    const { data } = await axiosInstance.get(`/graph/node/${nodeId}`);
    return data;
  },
  getCausalChain: async ({ nodeId, maxHops = 5 } = {}) => {
    const { data } = await axiosInstance.get(`/graph/causal-chain/${nodeId}`, {
      params: {
        max_hops: maxHops,
      },
    });
    return data;
  },
  getDecisions: async ({ orgId, file } = {}) => {
    const params = { org_id: orgId };
    if (file) {
      params.file = file;
    }

    const { data } = await axiosInstance.get('/graph/decisions', { params });
    return data;
  },
};

export default graphService;

