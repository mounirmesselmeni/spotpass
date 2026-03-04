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
  isTokenExpired: () => boolean;
  checkAndHandleExpiration: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
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

      // Check if token is expired
      isTokenExpired: () => {
        const expiresAt = get().expiresAt;
        if (!expiresAt) return true;
        return new Date(expiresAt) <= new Date();
      },

      // Auto logout if token is expired
      checkAndHandleExpiration: () => {
        if (get().isTokenExpired()) {
          get().logout();
          return true; // Token was expired and user was logged out
        }
        return false; // Token is still valid
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

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

/**
 * Attempt to refresh the access token using the stored refresh token.
 * Logs the user out if the refresh fails.
 */
async function tryRefreshToken(): Promise<void> {
  const authStore = useAuthStore.getState();
  if (!authStore.isAuthenticated || !authStore.refreshToken) return;
  if (!authStore.isTokenExpired()) return;

  const userType = authStore.user?.user_type || 'staff';
  const refreshEndpoint = userType === 'bo' ? '/api/bo/auth/refresh' : '/api/staff/auth/refresh';

  try {
    const response = await fetch(`${BASE_URL}${refreshEndpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: authStore.refreshToken }),
    });

    if (response.ok) {
      const data = await response.json();
      authStore.updateAccessToken(data.access_token, data.expires_at);
    } else {
      authStore.logout();
    }
  } catch {
    authStore.logout();
  }
}

// Initialize auth check on app startup
tryRefreshToken().catch(() => useAuthStore.getState().logout());

// Set up periodic token expiration check (every 5 minutes)
setInterval(tryRefreshToken, 5 * 60 * 1000);
