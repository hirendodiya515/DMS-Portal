import axios from 'axios';

const apiHost = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:3000`;

const api = axios.create({
  baseURL: apiHost,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('pd_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token and redirect to login if unauthorized
      localStorage.removeItem('pd_token');
      localStorage.removeItem('pd_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
