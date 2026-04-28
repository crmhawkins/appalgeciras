import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  RefreshControl, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../services/api';
import { colors } from '../../theme/colors';
import { Partido } from '../../types';

export default function PartidosScreen() {
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const { data } = await api.get<{ partidos: Partido[] }>('/api/partidos');
      setPartidos(data.partidos ?? []);
    } catch (e: any) {
      setError(e?.response?.data?.msg || e?.message || 'Error cargando partidos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

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
        <Text style={styles.headerTitle}>Partidos</Text>
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
      <FlatList
        data={partidos}
        keyExtractor={(p) => String(p.id)}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
          />
        }
        ListEmptyComponent={
          !error ? <Text style={styles.empty}>Sin partidos programados</Text> : null
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.teamsRow}>
              <View style={styles.team}>
                {item.escudoLocal ? (
                  <Image source={{ uri: item.escudoLocal }} style={styles.escudo} />
                ) : (
                  <View style={styles.escudoPlaceholder} />
                )}
                <Text style={styles.teamName} numberOfLines={2}>{item.equipoLocal}</Text>
              </View>

              <View style={styles.scoreBox}>
                {item.marcador ? (
                  <Text style={styles.marcador}>{item.marcador}</Text>
                ) : (
                  <Text style={styles.vs}>VS</Text>
                )}
                <Text style={styles.fecha}>
                  {formatFecha(item.fecha)}
                </Text>
                {item.hora ? <Text style={styles.hora}>{item.hora}</Text> : null}
              </View>

              <View style={styles.team}>
                {item.escudoVisitante ? (
                  <Image source={{ uri: item.escudoVisitante }} style={styles.escudo} />
                ) : (
                  <View style={styles.escudoPlaceholder} />
                )}
                <Text style={styles.teamName} numberOfLines={2}>{item.equipoVisitante}</Text>
              </View>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

function formatFecha(fecha: string): string {
  if (!fecha) return '';
  try {
    const [year, month, day] = fecha.split('T')[0].split('-');
    return `${day}/${month}/${year}`;
  } catch {
    return fecha;
  }
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 16, backgroundColor: colors.primary },
  headerTitle: { color: colors.white, fontSize: 20, fontWeight: 'bold' },
  list: { padding: 14 },
  card: {
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  teamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  team: { flex: 1, alignItems: 'center', gap: 6 },
  escudo: { width: 48, height: 48, resizeMode: 'contain' },
  escudoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.border,
  },
  teamName: {
    fontSize: 12,
    color: colors.text,
    textAlign: 'center',
    fontWeight: '600',
    maxWidth: 90,
  },
  scoreBox: { alignItems: 'center', paddingHorizontal: 8 },
  vs: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textSecondary,
  },
  marcador: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.primary,
  },
  fecha: { fontSize: 11, color: colors.textSecondary, marginTop: 4 },
  hora: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  empty: { textAlign: 'center', color: colors.textSecondary, marginTop: 24 },
  error: { color: colors.error, textAlign: 'center', marginTop: 12, paddingHorizontal: 16 },
});
