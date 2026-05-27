import axios, { AxiosInstance } from 'axios';
import { getToken, clearSession } from './auth';

// Unificado con la web Laravel — misma BD, mismas credenciales, misma API.
// Cambiado el 2026-05-26 (era backend-algeciras.hawkins.es).
export const API_BASE_URL = 'http://mos48s4400kwo44w0g0w0ssk.217.160.39.79.sslip.io';

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    config.headers = config.headers ?? {};
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  return config;
});

let _logoutCallback: (() => void) | null = null;
export function setLogoutCallback(fn: () => void) { _logoutCallback = fn; }

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    if (error?.response?.status === 401) {
      await clearSession();
      _logoutCallback?.();
    }
    return Promise.reject(error);
  }
);

export default api;
