import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: false,
});

export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
    localStorage.setItem('sv_token', token);
  } else {
    delete api.defaults.headers.common.Authorization;
    localStorage.removeItem('sv_token');
  }
}

const stored = localStorage.getItem('sv_token');
if (stored) setAuthToken(stored);

export default api;
