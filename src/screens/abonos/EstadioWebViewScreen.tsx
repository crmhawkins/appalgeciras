import React, { useRef, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useNavigation } from '@react-navigation/native';
import { API_BASE_URL } from '../../services/api';
import { getToken } from '../../services/auth';
import { colors } from '../../theme/colors';

/**
 * Pantalla "WebView del estadio" — selector compartido web/app.
 *
 * En vez de duplicar GradasScreen + SectoresScreen + AsientosScreen en RN,
 * embebemos la vista /estadio de la web Laravel. Es el MISMO selector que
 * usan los usuarios en navegador.
 *
 * Flujo:
 *  1. Esta pantalla se abre con autoplay del JWT en query → la web
 *     reconoce al usuario.
 *  2. Cuando el usuario añade butacas al carrito, la web envía
 *     postMessage({type: 'cart-add', seatIds, sectorId, total}) al wrapper.
 *  3. Aquí recogemos ese mensaje y navegamos al CheckoutScreen nativo
 *     (Stripe PaymentSheet) con el carrito.
 */
export default function EstadioWebViewScreen() {
  const navigation = useNavigation();
  const webviewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  // Cargar token al montar
  React.useEffect(() => {
    getToken().then(setToken);
  }, []);

  const uri = `${API_BASE_URL}/estadio?native=1${token ? `&token=${encodeURIComponent(token)}` : ''}`;

  const onMessage = (event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'cart-add') {
        // navegar a checkout nativo con los IDs de butaca
        // @ts-ignore — Stack typing
        navigation.navigate('Checkout', { items: msg.items, total: msg.total });
      } else if (msg.type === 'close') {
        navigation.goBack();
      }
    } catch (e) {
      // Si no es JSON, ignorar
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {loading && (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
      <WebView
        ref={webviewRef}
        source={{ uri }}
        onMessage={onMessage}
        onLoadEnd={() => setLoading(false)}
        onError={() => Alert.alert('Error', 'No se pudo cargar el selector de butacas.')}
        startInLoadingState
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        allowsBackForwardNavigationGestures
        style={styles.webview}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background ?? '#0a0a0a' },
  webview: { flex: 1, backgroundColor: 'transparent' },
  loader: {
    position: 'absolute',
    inset: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 10,
  },
});
