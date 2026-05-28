import axios, { AxiosInstance } from 'axios';
import { getToken, clearSession } from './auth';

// Unificado con la web Laravel — misma BD, mismas credenciales, misma API.
// Mismo dominio que la web pública (HTTPS con Let's Encrypt en Coolify).
export const API_BASE_URL = 'https://algecirascf.hawkins.es';

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
