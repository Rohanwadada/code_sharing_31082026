import Axios from 'axios';
import { getCsrfToken } from './csrf';
import { refresh } from './auth';

const questionGenAxios = Axios.create({
  baseURL: process.env.NEXT_PUBLIC_QUESTION_GEN_API_SERVER_URL,
  withCredentials: true,
});

questionGenAxios.interceptors.request.use((config) => {
  const csrf = getCsrfToken();

  if (csrf) {
    config.headers['X-CSRF-Token'] = csrf;
  }

  return config;
});

questionGenAxios.interceptors.response.use(
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

export default questionGenAxios;
