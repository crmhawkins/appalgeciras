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
import api from '../../services/api';
import { colors } from '../../theme/colors';
import { Sector, AbonosStackParamList } from '../../types';

type SectoresRouteProp = RouteProp<AbonosStackParamList, 'Sectores'>;

export default function SectoresScreen() {
  const navigation = useNavigation<any>();
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
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{gradaNombre}</Text>
        <Text style={styles.headerSub}>Sectores disponibles</Text>
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
        ListEmptyComponent={
          !error ? <Text style={styles.empty}>No hay sectores en esta grada</Text> : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() =>
              navigation.navigate('Asientos', {
                sectorId: item.id,
                sectorNombre: item.nombre,
                precio: item.precio,
              })
            }
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{item.nombre}</Text>
              <Text style={styles.cardText}>Capacidad: {item.capacidad}</Text>
              <Text style={styles.cardPrice}>{item.precio} € / temporada</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Disponible</Text>
            </View>
          </TouchableOpacity>
        )}
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
  cardPrice: { fontSize: 16, color: colors.primary, fontWeight: 'bold', marginTop: 6 },
  badge: {
    backgroundColor: colors.success,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: { color: colors.white, fontSize: 12, fontWeight: 'bold' },
  empty: { textAlign: 'center', color: colors.textSecondary, marginTop: 24 },
  error: { color: colors.error, textAlign: 'center', marginTop: 12 },
});
