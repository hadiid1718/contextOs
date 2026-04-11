import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4001/api/v1';

const adminAxios = axios.create({
  baseURL,
  timeout: 15000,
  withCredentials: true,
});

export default adminAxios;
