import axios from 'axios';

const getApiBaseUrl = (): string => {
  // Check if a specific backend URL is defined in the environment
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && envUrl.trim() !== '') {
    return envUrl;
  }
  
  // Otherwise, default to dynamic resolution matching the client's current host
  const backendHost = window.location.hostname || 'localhost';
  return `http://${backendHost}:3000`;
};

const api = axios.create({
  baseURL: getApiBaseUrl(),
});

export default api;
