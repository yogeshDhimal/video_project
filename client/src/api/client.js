import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: false,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sv_token');

  const isAuthPath = config.url?.includes('/auth/login') || config.url?.includes('/auth/register');
  if (token && !isAuthPath) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem('sv_token', token);
  } else {
    localStorage.removeItem('sv_token');
  }
}

export default api;

