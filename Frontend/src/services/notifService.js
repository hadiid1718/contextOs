import axiosInstance from '../lib/axios';

const notifService = {
  list: async ({ page = 1, limit = 8, unreadOnly = false } = {}) => {
    const { data } = await axiosInstance.get('/notifications', {
      params: {
        page,
        limit,
        unreadOnly,
      },
    });
    return data;
  },
  markAsRead: async (id) => {
    const { data } = await axiosInstance.post(`/notifications/${id}/read`);
    return data;
  },
  markAllRead: async () => {
    const { data } = await axiosInstance.post('/notifications/read-all');
    return data;
  },
  getPreferences: async () => {
    const { data } = await axiosInstance.get('/notifications/preferences');
    return data;
  },
  updatePreferences: async (payload) => {
    const { data } = await axiosInstance.patch('/notifications/preferences', payload);
    return data;
  },
};

export default notifService;

