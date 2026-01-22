import Axios, { AxiosRequestConfig, AxiosError } from 'axios';
import { notifications } from '@mantine/notifications';
import { useAuthStore } from '@/stores/auth.store';

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

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
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    // Handle 401 errors (unauthorized)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Get auth state from Zustand store (single source of truth)
      const { refreshToken, user, updateAccessToken, logout } = useAuthStore.getState();

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

          // Update the original request with new token
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${access_token}`;
          }

          // Retry the original request
          return axios(originalRequest);
        } catch (refreshError) {
          // Refresh failed, logout and redirect to login
          logout();
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      } else {
        // No refresh token, logout and redirect to login
        logout();
        window.location.href = '/login';
      }
    }

    // Show error notification for other errors
    if (error.response?.status && error.response.status >= 400) {
      const errorData = error.response.data as Record<string, unknown>;
      const message = String(errorData?.detail || errorData?.message || error.message);
      notifications.show({
        title: 'Error',
        message,
        color: 'red',
      });
    }

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
