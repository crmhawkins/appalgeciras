import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  RefreshControl, Image, TouchableOpacity,
} from 'react-native';
import api from '../../services/api';
import { colors } from '../../theme/colors';
import { Partido } from '../../types';

type Tab = 'proximos' | 'jugados';

const ACF_ESCUDO = 'https://backend-algeciras.hawkins.es/acf/2025/01/escudoAlgeSvg.png';

function EscudoImage({ uri, nombre }: { uri?: string; nombre: string }) {
  const [error, setError] = useState(false);
  const isAlgeciras = nombre?.toLowerCase().includes('algeciras');
  const resolvedUri = uri || (isAlgeciras ? ACF_ESCUDO : undefined);
  const initials = nombre
    ? nombre.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : '?';
  if (!resolvedUri || error) {
    return (
      <View style={styles.escudoPlaceholder}>
        <Text style={styles.escudoInitials}>{initials}</Text>
      </View>
    );
  }
  return (
    <Image
      source={{ uri: resolvedUri }}
      style={styles.escudo}
      onError={() => setError(true)}
    />
  );
}

export default function PartidosScreen() {
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('proximos');

  const load = useCallback(async () => {
    setError(null);
    try {
      const { data } = await api.get<Partido[] | { partidos: Partido[] }>('/api/partidos');
      setPartidos(Array.isArray(data) ? data : ((data as any).partidos ?? []));
    } catch (e: any) {
      setError(e?.response?.data?.msg || e?.message || 'Error cargando partidos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const today = new Date().toISOString().split('T')[0];

  const proximos = partidos
    .filter((p) => p.fecha.split('T')[0] >= today)
    .sort((a, b) => a.fecha.split('T')[0].localeCompare(b.fecha.split('T')[0]));

  const jugados = partidos
    .filter((p) => p.fecha.split('T')[0] < today)
    .sort((a, b) => b.fecha.split('T')[0].localeCompare(a.fecha.split('T')[0]));

  const data = tab === 'proximos' ? proximos : jugados;

  if (loading) {
    return (
      <View style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.safe}>
      <View style={styles.competitionBanner}>
        <Text style={styles.competitionText}>⚽ Primera RFEF · Grupo 2 · Temporada 2024/25</Text>
      </View>
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'proximos' && styles.tabBtnActive]}
          onPress={() => setTab('proximos')}
        >
          <Text style={[styles.tabText, tab === 'proximos' && styles.tabTextActive]}>
            Por jugar
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'jugados' && styles.tabBtnActive]}
          onPress={() => setTab('jugados')}
        >
          <Text style={[styles.tabText, tab === 'jugados' && styles.tabTextActive]}>
            Jugados
          </Text>
        </TouchableOpacity>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}
      <FlatList
        data={data}
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
                <EscudoImage uri={item.escudoLocal} nombre={item.equipoLocal} />
                <Text style={styles.teamName} numberOfLines={2}>{item.equipoLocal}</Text>
              </View>

              <View style={styles.scoreBox}>
                {item.marcador ? (
                  <Text style={styles.marcador}>{item.marcador}</Text>
                ) : (
                  <Text style={styles.vs}>VS</Text>
                )}
                <Text style={styles.fecha}>{formatFecha(item.fecha)}</Text>
                {item.hora ? <Text style={styles.hora}>{item.hora}</Text> : null}
              </View>

              <View style={styles.team}>
                <EscudoImage uri={item.escudoVisitante} nombre={item.equipoVisitante} />
                <Text style={styles.teamName} numberOfLines={2}>{item.equipoVisitante}</Text>
              </View>
            </View>
          </View>
        )}
      />
    </View>
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
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  tabBtnActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.white,
  },
  competitionBanner: {
    backgroundColor: colors.primary,
    paddingVertical: 8,
    alignItems: 'center',
  },
  competitionText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  escudoInitials: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.textSecondary,
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
