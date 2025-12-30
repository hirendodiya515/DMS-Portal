import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';

interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    department?: string;
}

interface AuthState {
    user: User | null;
    token: string | null;
    refreshToken: string | null;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
    setUser: (user: User | null) => void;
    setToken: (token: string | null) => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            token: null,
            refreshToken: null,
            isAuthenticated: false,

            login: async (email: string, password: string) => {
                try {
                    const response = await axios.post('http://localhost:3000/auth/login', {
                        email,
                        password,
                    });

                    const { user, accessToken, refreshToken } = response.data;

                    set({
                        user,
                        token: accessToken,
                        refreshToken,
                        isAuthenticated: true,
                    });
                } catch (error) {
                    console.error('Login failed:', error);
                    throw error;
                }
            },

            logout: () => {
                set({
                    user: null,
                    token: null,
                    refreshToken: null,
                    isAuthenticated: false,
                });
            },

            setUser: (user) => set({ user }),
            setToken: (token) => set({ token }),
        }),
        {
            name: 'auth-storage',
        }
    )
);
