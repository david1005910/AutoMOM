import axios from 'axios';
import { useAuthStore } from '@/stores/authStore';

export const apiClient = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing: Promise<void> | null = null;

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      if (!refreshing) {
        refreshing = useAuthStore
          .getState()
          .refreshToken()
          .finally(() => { refreshing = null; });
      }
      try {
        await refreshing;
        const token = useAuthStore.getState().accessToken;
        original.headers.Authorization = `Bearer ${token}`;
        return apiClient(original);
      } catch {
        useAuthStore.getState().logout();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
