import Axios, { AxiosRequestConfig, AxiosError } from 'axios';
import { notifications } from '@mantine/notifications';

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

export const axios = Axios.create({
  baseURL: BACKEND_URL,
});

// Request interceptor to add auth token
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
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

      // Try to refresh token
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          // Determine which refresh endpoint to use based on user type
          const userType = localStorage.getItem('user_type') || 'staff';
          const refreshEndpoint =
            userType === 'bo' ? '/api/bo/auth/refresh' : '/api/staff/auth/refresh';

          // Call refresh token endpoint
          const refreshResponse = await Axios.post(`${BACKEND_URL}${refreshEndpoint}`, {
            refresh_token: refreshToken,
          });

          const { access_token, expires_at } = refreshResponse.data;

          // Store new access token
          localStorage.setItem('access_token', access_token);
          localStorage.setItem('token_expires_at', expires_at);

          // Update the original request with new token
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${access_token}`;
          }

          // Retry the original request
          return axios(originalRequest);
        } catch (refreshError) {
          // Refresh failed, clear tokens and redirect to login
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user_type');
          localStorage.removeItem('token_expires_at');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      } else {
        // No refresh token, redirect to login
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

export default customInstance;
