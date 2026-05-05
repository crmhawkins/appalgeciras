import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import api from '../../services/api';
import { Partido } from '../../types';

interface VotoResult {
  jugador: string;
  votos: number;
  porcentaje: number;
}

interface PartidoConJugadores extends Partido {
  jugadoresLocales?: string[];
}

const JUGADORES_ALGECIRAS = [
  // Porteros
  'Iván Moreno', 'Samu Casado',
  // Defensas
  'Carlos Arauz', 'Joseca', 'Álvaro Mayorga', 'Víctor Ruíz',
  'Aleix Coch', 'Ángel Gómez', 'Tomás Sánchez', 'Paris Adot',
  // Centrocampistas
  'Iván Turrillo', 'Óscar Castro', 'Jony Álamo', 'Joe Riley',
  'Dani Garrido', 'Eric Montes',
  // Delanteros
  'Juanma García', 'Isaac Obeng', 'Rastrojo', 'Manín', 'Andre Nader',
];

export default function FanZoneScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();

  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [partidoActivo, setPartidoActivo] = useState<Partido | null>(null);
  const [votos, setVotos] = useState<VotoResult[]>([]);
  const [miVoto, setMiVoto] = useState<string | null>(null);
  const [totalVotos, setTotalVotos] = useState(0);
  const [loading, setLoading] = useState(true);
  const [votando, setVotando] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadPartidos = useCallback(async () => {
    try {
      const { data } = await api.get('/api/partidos');
      const lista: Partido[] = data.partidos ?? [];
      setPartidos(lista);
      const activo = lista.find(p => p.marcador !== null && p.marcador !== undefined) ?? lista[0] ?? null;
      setPartidoActivo(activo);
      return activo;
    } catch { return null; }
  }, []);

  const loadVotos = useCallback(async (pid: number) => {
    try {
      const { data } = await api.get(`/api/fanzone/${pid}/votos`);
      setVotos(data.resultado ?? []);
      setTotalVotos(data.total ?? 0);
    } catch {}
  }, []);

  const loadMiVoto = useCallback(async (pid: number) => {
    if (!user) return;
    try {
      const { data } = await api.get(`/api/fanzone/${pid}/mi-voto`);
      setMiVoto(data.voto);
    } catch {}
  }, [user]);

  const load = useCallback(async () => {
    setLoading(true);
    const activo = await loadPartidos();
    if (activo) {
      await Promise.all([loadVotos(activo.id), loadMiVoto(activo.id)]);
    }
    setLoading(false);
  }, [loadPartidos, loadVotos, loadMiVoto]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  useEffect(() => { load(); }, [load]);

  const handleVotar = async (jugador: string) => {
    if (!user) {
      Alert.alert('Inicia sesión', 'Necesitas cuenta para votar', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Iniciar sesión', onPress: () => navigation.navigate('Auth', { screen: 'Login' }) },
      ]);
      return;
    }
    if (!partidoActivo) return;
    setVotando(true);
    try {
      await api.post(`/api/fanzone/${partidoActivo.id}/votar`, { jugador });
      setMiVoto(jugador);
      await loadVotos(partidoActivo.id);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.msg || 'Error al votar');
    } finally {
      setVotando(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}><Text style={styles.headerTitle}>Fan Zone</Text></View>
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}><Text style={styles.headerTitle}>⚡ Fan Zone</Text></View>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
      >
        {/* Partido activo */}
        {partidoActivo && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Partido activo</Text>
            <View style={styles.matchRow}>
              <Text style={styles.teamName} numberOfLines={1}>{partidoActivo.equipoLocal}</Text>
              <View style={styles.scoreBox}>
                <Text style={styles.score}>{partidoActivo.marcador ?? 'vs'}</Text>
              </View>
              <Text style={styles.teamName} numberOfLines={1}>{partidoActivo.equipoVisitante}</Text>
            </View>
          </View>
        )}

        {/* Fan of the Match */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>⭐ Fan of the Match</Text>
          <Text style={styles.sectionSubtitle}>
            {miVoto ? `Tu voto: ${miVoto}` : 'Vota al mejor jugador del partido'}
          </Text>

          {!partidoActivo ? (
            <Text style={styles.emptyText}>No hay partido activo para votar</Text>
          ) : (
            <View style={styles.jugadoresGrid}>
              {JUGADORES_ALGECIRAS.map((j) => {
                const isSelected = miVoto === j;
                const votoData = votos.find(v => v.jugador === j);
                return (
                  <TouchableOpacity
                    key={j}
                    style={[styles.jugadorBtn, isSelected && styles.jugadorBtnSelected]}
                    onPress={() => handleVotar(j)}
                    disabled={votando}
                  >
                    <Text style={[styles.jugadorName, isSelected && styles.jugadorNameSelected]}>{j}</Text>
                    {votoData && (
                      <Text style={[styles.jugadorVotos, isSelected && styles.jugadorVotosSelected]}>
                        {votoData.porcentaje}%
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Resultados */}
        {votos.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>📊 Resultados ({totalVotos} votos)</Text>
            {votos.slice(0, 5).map((v, i) => (
              <View key={v.jugador} style={styles.resultRow}>
                <Text style={styles.resultPos}>{i + 1}°</Text>
                <Text style={styles.resultNombre} numberOfLines={1}>{v.jugador}</Text>
                <View style={styles.barContainer}>
                  <View style={[styles.bar, { width: `${v.porcentaje}%` as any }]} />
                </View>
                <Text style={styles.resultPct}>{v.porcentaje}%</Text>
              </View>
            ))}
          </View>
        )}

        {/* Fan Zone extra */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>🏟️ Próximamente</Text>
          <Text style={styles.comingText}>• Predicciones de resultado</Text>
          <Text style={styles.comingText}>• Ranking de aficionados</Text>
          <Text style={styles.comingText}>• Quinielas del partido</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { padding: 16, backgroundColor: colors.primary },
  headerTitle: { color: colors.white, fontSize: 20, fontWeight: 'bold' },
  container: { padding: 16, paddingBottom: 32 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  cardLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  matchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  teamName: { flex: 1, fontSize: 15, fontWeight: 'bold', color: colors.text, textAlign: 'center' },
  scoreBox: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginHorizontal: 8,
  },
  score: { color: colors.white, fontWeight: 'bold', fontSize: 18 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: colors.primary, marginBottom: 4 },
  sectionSubtitle: { fontSize: 13, color: colors.textSecondary, marginBottom: 14 },
  emptyText: { color: colors.textSecondary, textAlign: 'center', paddingVertical: 12 },
  jugadoresGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  jugadorBtn: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    backgroundColor: colors.background,
    minWidth: '45%',
    flex: 1,
  },
  jugadorBtnSelected: { borderColor: colors.primary, backgroundColor: '#e8f5ee' },
  jugadorName: { fontSize: 13, color: colors.text, fontWeight: '600' },
  jugadorNameSelected: { color: colors.primary },
  jugadorVotos: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  jugadorVotosSelected: { color: colors.primary },
  resultRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 6 },
  resultPos: { width: 22, fontSize: 13, fontWeight: 'bold', color: colors.primary },
  resultNombre: { width: 110, fontSize: 13, color: colors.text },
  barContainer: { flex: 1, height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden' },
  bar: { height: 8, backgroundColor: colors.primary, borderRadius: 4 },
  resultPct: { width: 36, fontSize: 12, color: colors.textSecondary, textAlign: 'right' },
  comingText: { fontSize: 14, color: colors.textSecondary, marginTop: 6 },
});
