import { apiClient } from './client';
import type { LoginInput, RegisterInput, User } from '@/types/auth';

export const authApi = {
  login: (input: LoginInput) =>
    apiClient.post<{ data: { user: User; accessToken: string } }>('/auth/login', input),

  register: (input: RegisterInput) =>
    apiClient.post<{ data: { user: User; accessToken: string } }>('/auth/register', input),

  logout: () => apiClient.post('/auth/logout'),

  refresh: () =>
    apiClient.post<{ data: { accessToken: string } }>('/auth/refresh'),

  me: () =>
    apiClient.get<{ data: { user: User } }>('/auth/me'),
};
