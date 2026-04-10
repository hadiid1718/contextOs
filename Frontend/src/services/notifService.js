import axiosInstance from '../lib/axios';

const notifService = {
  list: async () => {
    const { data } = await axiosInstance.get('/notifications');
    return data;
  },
  markAsRead: async (id) => {
    const { data } = await axiosInstance.post(`/notifications/${id}/read`);
    return data;
  },
};

export default notifService;

