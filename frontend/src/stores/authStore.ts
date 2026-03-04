import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '@/api/auth';
import type { User, LoginInput, RegisterInput } from '@/types/auth';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  setToken: (token: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,

      login: async (input) => {
        const res = await authApi.login(input);
        set({ user: res.data.data.user, accessToken: res.data.data.accessToken });
      },

      register: async (input) => {
        const res = await authApi.register(input);
        set({ user: res.data.data.user, accessToken: res.data.data.accessToken });
      },

      logout: () => {
        authApi.logout().catch(() => {});
        set({ user: null, accessToken: null });
      },

      refreshToken: async () => {
        const res = await authApi.refresh();
        set({ accessToken: res.data.data.accessToken });
      },

      setToken: (token) => set({ accessToken: token }),
    }),
    {
      name: 'auth',
      partialize: (state) => ({ user: state.user }),
    }
  )
);
