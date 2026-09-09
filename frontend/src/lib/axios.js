import Axios from 'axios';
import { getCsrfToken } from './csrf';
import { refresh } from './auth';

const axios = Axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_SERVER_URL,
  withCredentials: true,
});

axios.interceptors.request.use((config) => {
  const csrf = getCsrfToken();

  if (csrf) {
    config.headers['X-CSRF-Token'] = csrf;
  }

  return config;
});

axios.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;

    const data = error.response?.data;

    if (
      error.response?.status === 401 &&
      data?.error === 'TOKEN_EXPIRED' &&
      data?.type === 'access' &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      try {
        await refresh();

        return axios(originalRequest);
      } catch {
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  },
);

export default axios;
