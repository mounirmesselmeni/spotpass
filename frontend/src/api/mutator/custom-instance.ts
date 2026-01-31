import Axios, { AxiosRequestConfig, AxiosError } from 'axios';
import { notifications } from '@mantine/notifications';
import { useAuthStore } from '@/stores/auth.store';

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

// Track consecutive 401 errors to prevent infinite loops
let consecutive401Count = 0;
const MAX_CONSECUTIVE_401 = 3;

export const axios = Axios.create({
  baseURL: BACKEND_URL,
});

// Request interceptor to add auth token
axios.interceptors.request.use(
  (config) => {
    // Get token from Zustand store (single source of truth)
    const token = useAuthStore.getState().accessToken;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle errors and token refresh
axios.interceptors.response.use(
  (response) => {
    // Reset 401 counter on successful response
    if (consecutive401Count > 0) {
      consecutive401Count = 0;
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    // Handle 401 errors (unauthorized)
    if (error.response?.status === 401) {
      consecutive401Count++;

      // If we have too many consecutive 401s, logout immediately
      if (consecutive401Count >= MAX_CONSECUTIVE_401) {
        console.log('Too many consecutive 401 errors, logging out');
        const { logout } = useAuthStore.getState();
        logout();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      // Only retry once per request
      if (!originalRequest._retry) {
        originalRequest._retry = true;

        // Get auth state from Zustand store (single source of truth)
        const { refreshToken, user, updateAccessToken, logout, isTokenExpired } =
          useAuthStore.getState();

        // Check if token is already expired locally
        if (isTokenExpired()) {
          console.log('Token expired locally, logging out');
          logout();
          window.location.href = '/login';
          return Promise.reject(error);
        }

        if (refreshToken) {
          try {
            // Determine which refresh endpoint to use based on user type
            const userType = user?.user_type || 'staff';
            const refreshEndpoint =
              userType === 'bo' ? '/api/bo/auth/refresh' : '/api/staff/auth/refresh';

            // Call refresh token endpoint
            const refreshResponse = await Axios.post(`${BACKEND_URL}${refreshEndpoint}`, {
              refresh_token: refreshToken,
            });

            const { access_token, expires_at } = refreshResponse.data;

            // Update Zustand store with new access token
            updateAccessToken(access_token, expires_at);

            // Reset 401 counter on successful refresh
            consecutive401Count = 0;

            // Update the original request with new token
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${access_token}`;
            }

            // Retry the original request
            return axios(originalRequest);
          } catch (refreshError) {
            // Refresh failed, logout and redirect to login
            console.log('Token refresh failed, logging out');
            logout();
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        } else {
          // No refresh token, logout and redirect to login
          console.log('No refresh token available, logging out');
          logout();
          window.location.href = '/login';
        }
      }
    }

    // Show error notification for other errors
    // Skip 422 (validation errors) - let forms handle them with field-level errors
    // Skip 400 (bad request) - forms will handle these too
    if (error.response?.status && error.response.status >= 500) {
      // Only show notifications for server errors (500+)
      const errorData = error.response.data as Record<string, unknown>;
      const message = String(errorData?.detail || errorData?.message || error.message);
      notifications.show({
        title: 'Error',
        message,
        color: 'red',
      });
    }
    // For 400-499 errors (client errors), let the calling code handle them
    // This allows forms to show field-level validation errors properly

    return Promise.reject(error);
  }
);

export const customInstance = <T>(config: AxiosRequestConfig): Promise<T> => {
  const source = Axios.CancelToken.source();
  const promise = axios({
    ...config,
    cancelToken: source.token,
  }).then(({ data }) => data);

  // @ts-expect-error - Adding cancel method to promise
  promise.cancel = () => {
    source.cancel('Query was cancelled');
  };

  return promise;
};

export const customInstanceWithUrl = async <T>(url: string, config?: RequestInit): Promise<T> => {
  // Clean URL to remove null/undefined params
  let cleanUrl = url;
  if (url.includes('?')) {
    const [path, queryString] = url.split('?');
    const params = new URLSearchParams(queryString);
    const cleanParams = new URLSearchParams();

    params.forEach((value, key) => {
      if (value !== 'null' && value !== 'undefined' && value !== '') {
        cleanParams.append(key, value);
      }
    });

    cleanUrl = path + (cleanParams.toString() ? '?' + cleanParams.toString() : '');
  }

  // Convert RequestInit to AxiosRequestConfig
  const axiosConfig: AxiosRequestConfig = {
    url: cleanUrl,
    method: config?.method as any,
    headers: config?.headers as any,
    data: config?.body,
    signal: config?.signal as any, // Cast to any to handle AbortSignal vs GenericAbortSignal
  };

  // Call axios directly to get the full response
  const source = Axios.CancelToken.source();
  const response = await axios({
    ...axiosConfig,
    cancelToken: source.token,
  });

  // Return the response in the format Orval expects: { data, status, headers }
  return {
    data: response.data,
    status: response.status,
    headers: response.headers,
  } as T;
};

export default customInstance;
