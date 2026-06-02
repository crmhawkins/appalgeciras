import { Platform, Linking, Alert } from 'react-native';
import api from './api';

/**
 * Servicio para integrar el abono con Apple Wallet (iOS) y Google Wallet
 * (Android). El QR queda accesible desde la lock screen sin desbloquear.
 *
 * Backend:
 *   GET /api/me/abonos/{ticketId}/apple-wallet   → blob .pkpass
 *   GET /api/me/abonos/{ticketId}/google-wallet  → { saveUrl }
 */

/**
 * Añade un abono a Apple Wallet (sólo iOS).
 * Descarga el .pkpass via axios responseType=blob, lo guarda en cache
 * con expo-file-system y lo abre con Sharing.shareAsync → iOS lo abre
 * directamente con la app Wallet.
 *
 * Requiere:
 *   - expo-file-system
 *   - expo-sharing
 * Si alguno no está instalado, hace fallback abriendo la URL del backend
 * (también dispara Wallet en iOS Safari directamente).
 */
export async function addToAppleWallet(ticketId: number): Promise<void> {
  if (Platform.OS !== 'ios') {
    Alert.alert('Apple Wallet', 'Sólo disponible en iPhone');
    return;
  }

  try {
    const resp = await api.get<ArrayBuffer>(
      `/api/me/abonos/${ticketId}/apple-wallet`,
      { responseType: 'arraybuffer' }
    );

    // Lazy require para que la app no rompa si las libs no están instaladas.
    let FileSystem: any = null;
    let Sharing: any = null;
    try { FileSystem = require('expo-file-system'); } catch {}
    try { Sharing = require('expo-sharing'); } catch {}

    if (!FileSystem || !Sharing) {
      // Fallback: abrir la URL del backend directamente con el navegador,
      // Safari iOS importa el .pkpass al detectar el content-type.
      const baseUrl = (api.defaults.baseURL || '').replace(/\/$/, '');
      const url = `${baseUrl}/api/me/abonos/${ticketId}/apple-wallet`;
      await Linking.openURL(url);
      return;
    }

    // Convertir ArrayBuffer a base64 manualmente (Buffer no existe en RN).
    const bytes = new Uint8Array(resp.data);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    // global.btoa puede no estar disponible en todos los engines.
    const base64 = typeof btoa === 'function'
      ? btoa(binary)
      : require('react-native-quick-base64').btoa(binary);

    const fileUri = `${FileSystem.cacheDirectory}algeciras-cf-abono.pkpass`;
    await FileSystem.writeAsStringAsync(fileUri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        UTI: 'com.apple.pkpass',
        mimeType: 'application/vnd.apple.pkpass',
      });
    } else {
      await Linking.openURL(fileUri);
    }
  } catch (e: any) {
    const msg = e?.response?.data?.message
      || e?.response?.data?.detail
      || e?.message
      || 'No se pudo generar el pass';
    Alert.alert('Apple Wallet', msg);
  }
}

/**
 * Guarda el abono en Google Wallet (sólo Android).
 * Pide al backend la `saveUrl` JWT-firmada y la abre con Linking.
 */
export async function addToGoogleWallet(ticketId: number): Promise<void> {
  if (Platform.OS !== 'android') {
    Alert.alert('Google Wallet', 'Sólo disponible en Android');
    return;
  }

  try {
    const { data } = await api.get<{ saveUrl: string }>(
      `/api/me/abonos/${ticketId}/google-wallet`
    );
    if (!data?.saveUrl) {
      throw new Error('Respuesta inválida del servidor');
    }
    await Linking.openURL(data.saveUrl);
  } catch (e: any) {
    const msg = e?.response?.data?.message
      || e?.response?.data?.detail
      || e?.message
      || 'No se pudo añadir a Google Wallet';
    Alert.alert('Google Wallet', msg);
  }
}
