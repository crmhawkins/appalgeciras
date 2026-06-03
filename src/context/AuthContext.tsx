import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import api, { setLogoutCallback } from '../services/api';
import {
  saveToken,
  saveUser,
  getToken,
  getUser,
  clearSession,
} from '../services/auth';
import { Usuario, LoginResponse } from '../types';

interface AuthContextValue {
  user: Usuario | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (nombre: string, email: string, password: string, dni?: string, telefono?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updated: Partial<Usuario>) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Usuario | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      try {
        const storedToken = await getToken();
        const storedUser = await getUser();
        if (storedToken) setToken(storedToken);
        if (storedUser) setUser(storedUser);
        setLogoutCallback(() => { setToken(null); setUser(null); });
        if (storedToken) {
          try {
            const { status } = await Notifications.requestPermissionsAsync();
            if (status === 'granted') {
              const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
              const pushToken = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
              await api.put('/api/user/push-token', { expoPushToken: pushToken.data });
            }
          } catch (e) { /* silencioso */ }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    // 2026-06-02: el endpoint correcto del backend es `/api/authenticate`
    // (sin /login). Antes la app llamaba a `/api/authenticate/login` que
    // NO existía → 404 silencioso, el usuario veía "Error al iniciar sesión"
    // sin más detalle y le impedía entrar a la app.
    const { data } = await api.post<LoginResponse>('/api/authenticate', {
      email,
      password,
    });
    if (!data?.token) throw new Error('Respuesta inválida del servidor');
    await saveToken(data.token);
    if (data.usuario) await saveUser(data.usuario);
    setToken(data.token);
    setUser(data.usuario ?? null);
  }, []);

  const register = useCallback(async (nombre: string, email: string, password: string, dni?: string, telefono?: string) => {
    await api.post('/api/user/create', { nombre, email, password, dni, telefono });
    await login(email, password);
  }, [login]);

  const logout = useCallback(async () => {
    await clearSession();
    setToken(null);
    setUser(null);
  }, []);

  // 2026-06-03: REF en lugar de dependencia de `user` para mantener una
  // referencia ESTABLE de updateUser. Antes esta función se recreaba
  // en cada cambio de `user`, lo que reventaba `useCallback` en pantallas
  // que la usaban como dependencia (MiCuentaHomeScreen, FanZoneScreen…) y
  // provocaba LOOPS INFINITOS de fetch → "Tu temporada/Cerrar sesión/
  // FanZone parpadeando constantemente".
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);

  const updateUser = useCallback(async (updated: Partial<Usuario>) => {
    if (!userRef.current) return;
    const merged = { ...userRef.current, ...updated };
    setUser(merged);
    await saveUser(merged).catch(() => {});
  }, []); // sin deps → misma referencia para siempre

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
