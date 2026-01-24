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

// Initialize auth check on app startup
const initializeAuth = async () => {
  const authStore = useAuthStore.getState();
  if (authStore.isAuthenticated && authStore.refreshToken) {
    // Check if token is expired
    if (authStore.isTokenExpired()) {
      console.log('Access token expired on app startup, attempting refresh...');

      try {
        // Determine which refresh endpoint to use based on user type
        const userType = authStore.user?.user_type || 'staff';
        const refreshEndpoint =
          userType === 'bo' ? '/api/bo/auth/refresh' : '/api/staff/auth/refresh';

        // Try to refresh the token
        const response = await fetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}${refreshEndpoint}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              refresh_token: authStore.refreshToken,
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          // Update the store with new tokens
          authStore.updateAccessToken(data.access_token, data.expires_at);
          console.log('Token refreshed successfully on app startup');
        } else {
          // Refresh failed, logout
          console.log('Token refresh failed on app startup, logging out');
          authStore.logout();
        }
      } catch (error) {
        // Network error or other issue, logout
        console.log('Token refresh error on app startup, logging out:', error);
        authStore.logout();
      }
    }
  }
};

// Call initialization
initializeAuth().catch(console.error);

// Set up periodic token expiration check (every 5 minutes)
setInterval(
  async () => {
    const authStore = useAuthStore.getState();
    if (authStore.isAuthenticated && authStore.refreshToken) {
      if (authStore.isTokenExpired()) {
        console.log('Access token expired during periodic check, attempting refresh...');

        try {
          // Determine which refresh endpoint to use based on user type
          const userType = authStore.user?.user_type || 'staff';
          const refreshEndpoint =
            userType === 'bo' ? '/api/bo/auth/refresh' : '/api/staff/auth/refresh';

          const response = await fetch(
            `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}${refreshEndpoint}`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                refresh_token: authStore.refreshToken,
              }),
            }
          );

          if (response.ok) {
            const data = await response.json();
            authStore.updateAccessToken(data.access_token, data.expires_at);
            console.log('Token refreshed successfully during periodic check');
          } else {
            console.log('Token refresh failed during periodic check, logging out');
            authStore.logout();
          }
        } catch (error) {
          console.log('Token refresh error during periodic check, logging out:', error);
          authStore.logout();
        }
      }
    }
  },
  5 * 60 * 1000
); // Check every 5 minutes
