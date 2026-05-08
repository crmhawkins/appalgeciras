import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import api from '../../services/api';
import { colors } from '../../theme/colors';
import { Sector, AbonosStackParamList } from '../../types';
import MapaEstadio from '../../components/MapaEstadio';

type SectoresRouteProp = RouteProp<AbonosStackParamList, 'Sectores'>;

export default function SectoresScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AbonosStackParamList>>();
  const route = useRoute<SectoresRouteProp>();
  const { gradaId, gradaNombre } = route.params;

  const [sectores, setSectores] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const { data } = await api.get<{ sectores: Sector[] }>('/api/sectores');
      const filtered = (data.sectores ?? []).filter(
        (s) => Number(s.gradaId) === Number(gradaId) && s.activo !== false,
      );
      setSectores(filtered);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Error cargando sectores');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [gradaId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={[]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{gradaNombre}</Text>
        <Text style={styles.headerSub}>Paso 2 de 3 · Elige sector</Text>
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
      <FlatList
        data={sectores}
        keyExtractor={(s) => String(s.id)}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
          />
        }
        ListHeaderComponent={
          <View style={styles.mapaContainer}>
            <MapaEstadio gradaActiva={gradaNombre} />
          </View>
        }
        ListEmptyComponent={
          !error ? <Text style={styles.empty}>No hay sectores en esta grada</Text> : null
        }
        renderItem={({ item }) => {
          const sinCapacidad = item.capacidad === 0;
          const sinDisponibles = item.asientosDisponibles !== undefined && item.asientosDisponibles !== null
            ? item.asientosDisponibles === 0
            : false;
          const sinAsientos = sinCapacidad || sinDisponibles;
          const disponibles = item.asientosDisponibles;
          return (
            <TouchableOpacity
              style={sinAsientos ? [styles.card, styles.cardDisabled] : styles.card}
              disabled={sinAsientos}
              onPress={() =>
                navigation.navigate('Asientos', {
                  sectorId: item.id,
                  sectorNombre: item.nombre,
                  precio: item.precio,
                })
              }
              accessibilityLabel={`Sector ${item.nombre}, ${item.precio} €${sinAsientos ? ', sin plazas' : ''}`}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{item.nombre}</Text>
                {!sinAsientos && disponibles !== undefined && disponibles !== null && (
                  <Text style={styles.cardDisponibles}>
                    {disponibles} {disponibles === 1 ? 'sitio libre' : 'sitios libres'}
                  </Text>
                )}
                <View style={styles.precioContainer}>
                  <Text style={styles.precioAmount}>{item.precio} €</Text>
                  <Text style={styles.precioLabel}>/ temporada</Text>
                </View>
              </View>
              <View style={[styles.badge, sinAsientos && styles.badgeFull]}>
                <Text style={styles.badgeText}>
                  {sinAsientos ? 'Sin plazas' : 'Disponible'}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 16, backgroundColor: colors.primary },
  headerTitle: { color: colors.white, fontSize: 20, fontWeight: 'bold' },
  headerSub: { color: colors.white, opacity: 0.85, marginTop: 2 },
  list: { padding: 16 },
  mapaContainer: {
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
    height: 160,
    backgroundColor: '#1a1a2e',
  },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text },
  cardText: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  precioContainer: { flexDirection: 'row', alignItems: 'baseline', marginTop: 6, gap: 4 },
  precioAmount: { fontSize: 20, fontWeight: 'bold', color: colors.primary },
  precioLabel: { fontSize: 12, color: colors.textSecondary },
  badge: {
    backgroundColor: colors.success,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: { color: colors.white, fontSize: 12, fontWeight: 'bold' },
  cardDisabled: { opacity: 0.5 },
  cardDisponibles: { fontSize: 13, color: colors.success, fontWeight: '600', marginTop: 2 },
  badgeFull: { backgroundColor: '#9e9e9e' },
  empty: { textAlign: 'center', color: colors.textSecondary, marginTop: 24 },
  error: { color: colors.error, textAlign: 'center', marginTop: 12 },
});
