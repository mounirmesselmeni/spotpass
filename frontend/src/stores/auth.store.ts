import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  user_type: string; // Can be 'staff' or 'bo'
  role?: string | null;
  account_id?: number | null;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  expiresAt: string | null;

  setAuth: (accessToken: string, refreshToken: string, user: User, expiresAt: string) => void;
  updateAccessToken: (accessToken: string, expiresAt: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      expiresAt: null,

      setAuth: (accessToken, refreshToken, user, expiresAt) => {
        // Zustand persist middleware handles localStorage automatically
        set({
          accessToken,
          refreshToken,
          user,
          expiresAt,
          isAuthenticated: true,
        });
      },

      updateAccessToken: (accessToken, expiresAt) => {
        // Zustand persist middleware handles localStorage automatically
        set({ accessToken, expiresAt });
      },

      logout: () => {
        // Zustand persist middleware handles localStorage cleanup automatically
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          expiresAt: null,
          isAuthenticated: false,
        });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        expiresAt: state.expiresAt,
      }),
    }
  )
);
