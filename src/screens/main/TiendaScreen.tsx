import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
import { colors } from '../../theme/colors';

// La tienda oficial vive en un subdominio externo
// (tienda.algecirasclubdefutbol.com), no dentro de la app ni del dominio
// principal. Esta pantalla solo sirve de puente: al montarse abre el
// navegador in-app con la URL del subdominio y, en cuanto se cierra, vuelve
// atrás en el stack para que el usuario quede en la pestaña anterior.
// Se mantiene como pantalla navegable porque sigue siendo destino de
// `navigation.navigate('TiendaTab')` desde otras partes de la app.
const TIENDA_URL = 'https://tienda.algecirasclubdefutbol.com';

export default function TiendaScreen() {
  const navigation = useNavigation<any>();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await WebBrowser.openBrowserAsync(TIENDA_URL);
      } catch {
        // si el navegador in-app falla, no hacemos nada especial: simplemente
        // volvemos atrás para no dejar al usuario en una pantalla vacía.
      }
      if (!cancelled && navigation.canGoBack()) {
        navigation.goBack();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigation]);

  return (
    <SafeAreaView style={styles.center} edges={['top']}>
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
