import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000', // Matches your backend port
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('moc_token');
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
      localStorage.removeItem('moc_token');
      localStorage.removeItem('moc_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
