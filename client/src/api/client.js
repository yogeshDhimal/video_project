import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: false,
});

/**
 * Request interceptor to attach Authorization header.
 * Using an interceptor is more robust than modifying defaults
 * especially during concurrent requests/state changes.
 */
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sv_token');
  // Skip adding token for auth endpoints to prevent conflicts
  const isAuthPath = config.url?.includes('/auth/login') || config.url?.includes('/auth/register');
  if (token && !isAuthPath) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Simple helper to update the stored token.
 * The interceptor will pick it up automatically for next requests.
 */
export function setAuthToken(token) {
  if (token) {
    localStorage.setItem('sv_token', token);
  } else {
    localStorage.removeItem('sv_token');
  }
}

export default api;

