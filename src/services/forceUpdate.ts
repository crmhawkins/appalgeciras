import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { API_BASE_URL } from './api';

/**
 * Respuesta del endpoint /api/app/version del backend.
 */
export interface AppVersionResponse {
  min_version: string;
  latest_version: string;
  force_update: boolean;
  store_url_ios: string;
  store_url_android: string;
  release_notes?: string;
}

/**
 * Resultado de checkForUpdate(): describe qué tiene que hacer la app
 * con la versión instalada.
 *
 * - forced: la versión local es inferior a min_version -> bloquear.
 * - recommended: la versión local es inferior a latest_version pero
 *   superior o igual a min_version -> avisar pero no bloquear.
 * - ninguno de los dos -> todo OK.
 */
export type ForceUpdateResult =
  | { forced: true; latest: string; storeUrl: string; releaseNotes?: string }
  | { forced: false; recommended: true; latest: string; storeUrl: string; releaseNotes?: string }
  | { forced: false; recommended?: false };

/**
 * Parsea una versión semver simple ("1.2.3" o "1.2") a array de números.
 * Devuelve [0,0,0] si la cadena no es válida.
 */
function parseSemver(v: string | undefined | null): [number, number, number] {
  if (!v || typeof v !== 'string') return [0, 0, 0];
  const parts = v
    .replace(/[^0-9.]/g, '')
    .split('.')
    .map((p) => parseInt(p, 10));
  return [parts[0] || 0, parts[1] || 0, parts[2] || 0];
}

/**
 * Devuelve <0 si a<b, 0 si igual, >0 si a>b.
 */
function compareSemver(a: string, b: string): number {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i];
  }
  return 0;
}

/**
 * Lee la versión instalada (la que está empaquetada en el binario)
 * desde expo-constants. Si no se encuentra, devuelve "0.0.0" lo que
 * forzaría la actualización — preferible a un fail-silent.
 */
function getInstalledVersion(): string {
  const v =
    (Constants as any)?.expoConfig?.version ??
    (Constants as any)?.manifest2?.extra?.expoClient?.version ??
    (Constants as any)?.manifest?.version ??
    null;
  return typeof v === 'string' && v.length > 0 ? v : '0.0.0';
}

/**
 * Devuelve la URL de la store según la plataforma.
 */
function pickStoreUrl(r: AppVersionResponse): string {
  return Platform.OS === 'ios' ? r.store_url_ios : r.store_url_android;
}

/**
 * Consulta el backend y decide si la app tiene que forzar actualización,
 * sugerirla o no hacer nada. Nunca lanza: si la red falla devuelve
 * `{ forced: false }` para no bloquear al usuario por culpa del servidor.
 */
export async function checkForUpdate(): Promise<ForceUpdateResult> {
  try {
    const installed = getInstalledVersion();

    const res = await fetch(`${API_BASE_URL}/api/app/version`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) return { forced: false };

    const data = (await res.json()) as AppVersionResponse;

    if (!data || typeof data.min_version !== 'string') {
      return { forced: false };
    }

    const storeUrl = pickStoreUrl(data);

    // Hard force: el servidor manda force_update=true (override) o la
    // versión instalada es estrictamente menor que el min_version.
    if (data.force_update || compareSemver(installed, data.min_version) < 0) {
      return {
        forced: true,
        latest: data.latest_version,
        storeUrl,
        releaseNotes: data.release_notes,
      };
    }

    // Soft recommendation: versión instalada < latest_version pero >= min_version.
    if (compareSemver(installed, data.latest_version) < 0) {
      return {
        forced: false,
        recommended: true,
        latest: data.latest_version,
        storeUrl,
        releaseNotes: data.release_notes,
      };
    }

    return { forced: false };
  } catch (_err) {
    // Cualquier error de red: no bloquear al usuario.
    return { forced: false };
  }
}
