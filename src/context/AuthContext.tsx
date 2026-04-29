import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
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
  register: (nombre: string, email: string, password: string, dni?: string) => Promise<void>;
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
              const pushToken = await Notifications.getExpoPushTokenAsync();
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
    const { data } = await api.post<LoginResponse>('/api/authenticate/login', {
      email,
      password,
    });
    if (!data?.token) throw new Error('Respuesta inválida del servidor');
    await saveToken(data.token);
    if (data.usuario) await saveUser(data.usuario);
    setToken(data.token);
    setUser(data.usuario ?? null);
  }, []);

  const register = useCallback(async (nombre: string, email: string, password: string, dni?: string) => {
    await api.post('/api/user/create', { nombre, email, password, dni });
    await login(email, password);
  }, [login]);

  const logout = useCallback(async () => {
    await clearSession();
    setToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback(async (updated: Partial<Usuario>) => {
    setUser(prev => {
      if (!prev) return prev;
      const merged = { ...prev, ...updated };
      saveUser(merged);
      return merged;
    });
  }, []);

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
