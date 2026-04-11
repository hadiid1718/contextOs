import axios from 'axios';
import useBillingStore from '../store/billingStore';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4001/api/v1';

const axiosInstance = axios.create({
  baseURL,
  timeout: 15000,
  withCredentials: true,
});

let refreshPromise = null;

axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const request = error?.config;
    const status = error?.response?.status;

    if (status === 429) {
      useBillingStore.getState().openUpgradeModal({
        message: error?.response?.data?.message || 'Upgrade to continue.',
        details: error?.response?.data?.details || null,
      });
    }

    if (!request || request._retry || status !== 401) {
      return Promise.reject(error);
    }

    request._retry = true;

    try {
      if (!refreshPromise) {
        refreshPromise = axios.post(
          `${baseURL}/auth/refresh`,
          {},
          {
            withCredentials: true,
          },
        );
      }

      const { data } = await refreshPromise;
      const token = data?.data?.accessToken || data?.accessToken;

      if (token) {
        localStorage.setItem('accessToken', token);
        request.headers.Authorization = `Bearer ${token}`;
      }

      return axiosInstance(request);
    } catch (refreshError) {
      localStorage.removeItem('accessToken');
      return Promise.reject(refreshError);
    } finally {
      refreshPromise = null;
    }
  },
);

export default axiosInstance;

