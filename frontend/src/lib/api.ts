import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add auth token
api.interceptors.request.use(
    (config) => {
        const token = useAuthStore.getState().token;
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const refreshToken = useAuthStore.getState().refreshToken;
                const response = await axios.post('http://localhost:3000/auth/refresh', {
                    refreshToken,
                });

                const { accessToken } = response.data;
                useAuthStore.getState().setToken(accessToken);

                originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                return api(originalRequest);
            } catch (refreshError) {
                useAuthStore.getState().logout();
                window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

// Audit Logs API
export const auditLogsApi = {
    getAll: (filters?: {
        startDate?: string;
        endDate?: string;
        section?: string;
        action?: string;
        search?: string;
    }) => {
        const params = new URLSearchParams();
        if (filters?.startDate) params.append('startDate', filters.startDate);
        if (filters?.endDate) params.append('endDate', filters.endDate);
        if (filters?.section) params.append('section', filters.section);
        if (filters?.action) params.append('action', filters.action);
        if (filters?.search) params.append('search', filters.search);
        
        return api.get(`/audit-logs?${params.toString()}`);
    },
    
    downloadExport: (filters?: {
        startDate?: string;
        endDate?: string;
        section?: string;
        action?: string;
        search?: string;
    }) => {
        const params = new URLSearchParams();
        if (filters?.startDate) params.append('startDate', filters.startDate);
        if (filters?.endDate) params.append('endDate', filters.endDate);
        if (filters?.section) params.append('section', filters.section);
        if (filters?.action) params.append('action', filters.action);
        if (filters?.search) params.append('search', filters.search);
        
        return api.get(`/audit-logs/export?${params.toString()}`, {
            responseType: 'blob',
        });
    },
};

export default api;
