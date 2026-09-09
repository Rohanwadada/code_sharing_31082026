import Axios from 'axios';
import { getCsrfToken } from './csrf';

const authClient = Axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_SERVER_URL,
  withCredentials: true,
});

authClient.interceptors.request.use((config) => {
  const csrf = getCsrfToken();

  if (csrf) {
    config.headers['X-CSRF-Token'] = csrf;
  }

  return config;
});

let refreshPromise = null;

export async function refresh() {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = authClient.post('/auth/refresh').finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

export async function logout() {
  try {
    await authClient.post('/auth/logout');
  } catch (_) {
    // ignore
  }

  window.location.href = '/login';
}
