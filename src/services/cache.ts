import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_TTL = 10 * 60 * 1000; // 10 minutos

export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(`cache_${key}`);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) return null;
    return data as T;
  } catch { return null; }
}

export async function setCached(key: string, data: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(`cache_${key}`, JSON.stringify({ data, ts: Date.now() }));
  } catch {}
}

export async function getCachedStale<T>(key: string): Promise<T | null> {
  // Devuelve datos aunque estén expirados (para modo offline)
  try {
    const raw = await AsyncStorage.getItem(`cache_${key}`);
    if (!raw) return null;
    return JSON.parse(raw).data as T;
  } catch { return null; }
}

export async function getCachedStaleWithTs<T>(key: string): Promise<{ data: T; ts: number } | null> {
  try {
    const raw = await AsyncStorage.getItem(`cache_${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return { data: parsed.data as T, ts: parsed.ts as number };
  } catch { return null; }
}
