/**
 * EntradasScreen — lista los próximos partidos en casa con sus entradas.
 *
 * Cada partido puede tener varias variantes de entrada (general, joven,
 * socio) — al pulsar una, abrimos la pasarela web en WebBrowser usando la
 * misma ruta /comprar-directo/{slug} que el flujo de abono. Mantenemos el
 * pago en webview porque eliminamos el Stripe nativo del proyecto (build
 * de iOS dejaba de compilar).
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
  RefreshControl, Image, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
import api, { API_BASE_URL } from '../../services/api';
import { getToken } from '../../services/auth';
import { colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { ESCUDO_URL } from '../../constants';

interface EntradaVariante {
  id: number;
  slug: string;
  nombre: string;
  precio: number;
}

interface PartidoEntrada {
  id: number;
  matchday: number | null;
  opponent: string;
  home: boolean;
  kickoff_at: string;
  fecha: string;
  hora: string;
  label: string;
  entradas: EntradaVariante[];
}

export default function EntradasScreen() {
  const navigation = useNavigation<any>();
  const { token } = useAuth();
  const [partidos, setPartidos] = useState<PartidoEntrada[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const { data } = await api.get<{ partidos: PartidoEntrada[] }>(
        '/api/partidos/proximos',
      );
      setPartidos(data?.partidos ?? []);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'No se pudieron cargar los partidos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleBuy = async (variant: EntradaVariante) => {
    if (!token) {
      navigation.navigate('Auth', { screen: 'Login' });
      return;
    }
    const url = `${API_BASE_URL}/comprar-directo/${variant.slug}`;
    try {
      await WebBrowser.openBrowserAsync(url, {
        dismissButtonStyle: 'cancel',
        toolbarColor: colors.primary,
      });
    } catch (e: any) {
      Alert.alert('Error', 'No se pudo abrir la pasarela de pago.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Image source={{ uri: ESCUDO_URL }} style={styles.escudo} resizeMode="contain" />
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Entradas</Text>
          <Text style={styles.subtitle}>Próximos partidos en El Mirador</Text>
        </View>
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <FlatList
        contentContainerStyle={styles.list}
        data={partidos}
        keyExtractor={(p) => String(p.id)}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          !error ? (
            <Text style={styles.empty}>No hay partidos próximos disponibles ahora mismo.</Text>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={styles.matchCard}>
            <Text style={styles.matchTitle}>
              {item.matchday ? `J${item.matchday} · ` : ''}{item.opponent}
            </Text>
            <Text style={styles.matchMeta}>
              {item.home ? 'En casa' : 'Fuera'} · {item.fecha} {item.hora}
            </Text>

            {item.entradas.length === 0 ? (
              <Text style={styles.noTickets}>
                Pendiente de salida a la venta
              </Text>
            ) : (
              <View style={{ marginTop: 12, gap: 8 }}>
                {item.entradas.map((variant) => (
                  <TouchableOpacity
                    key={variant.id}
                    style={styles.variantBtn}
                    onPress={() => handleBuy(variant)}
                    activeOpacity={0.85}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.variantName}>{variant.nombre}</Text>
                    </View>
                    <Text style={styles.variantPrice}>
                      {variant.precio.toFixed(2)} €
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.primary,
    gap: 12,
  },
  escudo: { width: 40, height: 40 },
  title: { color: colors.white, fontSize: 22, fontWeight: '800' },
  subtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 13 },

  list: { padding: 16, gap: 12 },
  empty: { textAlign: 'center', color: colors.textSecondary, marginTop: 30 },

  errorBox: { backgroundColor: '#FEE2E2', padding: 12, marginHorizontal: 16, borderRadius: 8, marginTop: 8 },
  errorText: { color: '#991B1B', fontSize: 13 },

  matchCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  matchTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  matchMeta:  { fontSize: 13, color: colors.textSecondary, marginTop: 3 },
  noTickets:  { color: colors.textSecondary, fontStyle: 'italic', marginTop: 10, fontSize: 13 },

  variantBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  variantName: { fontSize: 15, fontWeight: '700', color: colors.text },
  variantPrice: { fontSize: 16, fontWeight: '800', color: colors.primary, marginLeft: 12 },
});
