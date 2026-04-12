import axiosInstance from '../lib/axios';

const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4001/api/v1';

const openOauthPopup = (provider) => {
  const width = 520;
  const height = 700;
  const left = window.screenX + (window.outerWidth - width) / 2;
  const top = window.screenY + (window.outerHeight - height) / 2;

  return window.open(
    `${apiBase}/auth/oauth/${provider}`,
    `${provider}-oauth`,
    `width=${width},height=${height},left=${left},top=${top}`,
  );
};

const authService = {
  login: async (payload) => {
    const { data } = await axiosInstance.post('/auth/login', payload);
    return data;
  },
  register: async (payload) => {
    const { data } = await axiosInstance.post('/auth/register', payload);
    return data;
  },
  verifyEmail: async (token) => {
    const { data } = await axiosInstance.get(`/auth/verify-email/${token}`);
    return data;
  },
  resendVerification: async (payload) => {
    const { data } = await axiosInstance.post('/auth/resend-verification', payload);
    return data;
  },
  forgotPassword: async (payload) => {
    const { data } = await axiosInstance.post('/auth/forgot-password', payload);
    return data;
  },
  refresh: async () => {
    const { data } = await axiosInstance.post('/auth/refresh');
    return data;
  },
  logout: async () => {
    const { data } = await axiosInstance.post('/auth/logout');
    return data;
  },
  me: async () => {
    const { data } = await axiosInstance.get('/auth/me');
    return data;
  },
  oauthPopup: (provider) => openOauthPopup(provider),
};

export default authService;

