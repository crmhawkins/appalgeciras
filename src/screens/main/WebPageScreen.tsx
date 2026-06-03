import React, { useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import { API_BASE_URL } from '../../services/api';
import { MainStackParamList } from '../../navigation/MainStack';

/**
 * Pantalla genérica WebView para páginas estáticas/informativas del club.
 *
 * Se usa para Club, Contacto, Privacidad y cualquier otra página de
 * contenido que no merezca un componente RN dedicado. La web Laravel ya
 * es responsive y soporta `?native=1` para ocultar header/footer.
 *
 * Params (via route.params):
 *   - path: ruta relativa a montar sobre API_BASE_URL (p.ej. '/club')
 *   - title: título mostrado en el header
 */
export default function WebPageScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<MainStackParamList, 'WebPage'>>();
  const path = (route.params as any)?.path ?? '/';
  const title = (route.params as any)?.title ?? 'Algeciras CF';

  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);

  const uri = `${API_BASE_URL}${path}${path.includes('?') ? '&' : '?'}native=1`;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <View style={{ width: 32 }} />
      </View>

      {errored ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorIcon}>📡</Text>
          <Text style={styles.errorTitle}>No se pudo cargar la página</Text>
          <Text style={styles.errorSub}>Revisa tu conexión a internet.</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => { setErrored(false); setLoading(true); }}
          >
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <WebView
            source={{ uri }}
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
            onError={() => { setLoading(false); setErrored(true); }}
            onHttpError={() => { setLoading(false); setErrored(true); }}
            style={styles.webview}
            originWhitelist={['*']}
            startInLoadingState
          />
          {loading && (
            <View style={styles.loaderOverlay} pointerEvents="none">
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          )}
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 4,
  },
  backBtn: { width: 32, alignItems: 'center', justifyContent: 'center' },
  backText: { color: colors.white, fontSize: 28, fontWeight: '600' },
  title: { flex: 1, color: colors.white, fontSize: 17, fontWeight: 'bold' },
  webview: { flex: 1, backgroundColor: colors.background },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    top: 60, // bajo el header
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  errorBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorIcon: { fontSize: 50, marginBottom: 14 },
  errorTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 6 },
  errorSub: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: 20 },
  retryBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryText: { color: colors.white, fontSize: 15, fontWeight: '600' },
});
