import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  RefreshControl, Image, TouchableOpacity, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import api from '../../services/api';
import { getCached, setCached, getCachedStale } from '../../services/cache';
import { colors } from '../../theme/colors';
import { Partido } from '../../types';
import { ESCUDO_URL, COMPETICION, TEMPORADA_CORTA } from '../../constants';

type Tab = 'proximos' | 'jugados';

interface EventoPartido {
  id: number;
  minuto: number;
  tipo: string; // 'gol' | 'tarjeta_amarilla' | 'tarjeta_roja' | 'sustitucion'
  jugador: string;
  equipo: string;
}

const ACF_ESCUDO = ESCUDO_URL;

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
      accessibilityLabel={nombre}
    />
  );
}

async function programarRecordatorio(partido: Partido) {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permisos', 'Activa las notificaciones en ajustes para recibir recordatorios');
      return;
    }
    const fechaPartido = new Date(partido.fecha);
    if (partido.hora) {
      const [h, m] = partido.hora.split(':');
      fechaPartido.setHours(parseInt(h, 10), parseInt(m, 10));
    }
    const dosHorasAntes = new Date(fechaPartido.getTime() - 2 * 60 * 60 * 1000);

    if (dosHorasAntes <= new Date()) {
      Alert.alert('Tarde', 'El partido es muy próximo para programar recordatorio');
      return;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '⚽ ¡Partido hoy!',
        body: `${partido.equipoLocal} vs ${partido.equipoVisitante} — en 2 horas`,
        sound: true,
      },
      trigger: { date: dosHorasAntes } as any,
    });
    Alert.alert('✅ Recordatorio', 'Te avisaremos 2 horas antes del partido');
  } catch (_) {
    Alert.alert('Error', 'No se pudo programar el recordatorio');
  }
}

function eventoEmoji(tipo: string): string {
  if (tipo === 'gol') return '⚽';
  if (tipo === 'tarjeta_amarilla') return '🟨';
  if (tipo === 'tarjeta_roja') return '🟥';
  return '🔄';
}

export default function PartidosScreen() {
  const navigation = useNavigation<any>();
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [proximoPartido, setProximoPartido] = useState<Partido | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('proximos');
  const [eventos, setEventos] = useState<Record<number, EventoPartido[]>>({});
  const [offline, setOffline] = useState(false);
  const [countdown, setCountdown] = useState<string | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const cached = await getCached<{ partidos: Partido[]; proximoPartido: Partido | null }>('partidos');
    if (cached) {
      setPartidos(cached.partidos ?? []);
      setProximoPartido(cached.proximoPartido ?? null);
    }
    try {
      const { data } = await api.get<Partido[] | { partidos: Partido[]; proximoPartido?: Partido | null }>('/api/partidos');
      let partidosList: Partido[] = [];
      let proximo: Partido | null = null;
      if (Array.isArray(data)) {
        partidosList = data;
      } else {
        partidosList = (data as any).partidos ?? [];
        proximo = (data as any).proximoPartido ?? null;
      }
      setPartidos(partidosList);
      setProximoPartido(proximo);
      await setCached('partidos', { partidos: partidosList, proximoPartido: proximo });
      setOffline(false);
    } catch (e: any) {
      const stale = await getCachedStale<{ partidos: Partido[]; proximoPartido: Partido | null }>('partidos');
      if (stale) {
        setPartidos(stale.partidos ?? []);
        setProximoPartido(stale.proximoPartido ?? null);
        setOffline(true);
      } else {
        setError(e?.response?.data?.msg || e?.message || 'Error cargando partidos');
      }
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

  // Countdown al próximo partido (< 7 días)
  useEffect(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    const next = proximoPartido ?? proximos[0] ?? null;
    if (!next) { setCountdown(null); return; }
    const target = new Date(next.fecha);
    if (next.hora) {
      const [h, m] = next.hora.split(':');
      target.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
    }
    if (target.getTime() - Date.now() > 7 * 24 * 60 * 60 * 1000) { setCountdown(null); return; }
    const tick = () => {
      const diff = target.getTime() - Date.now();
      if (diff <= 0) { setCountdown('¡Partido en curso!'); clearInterval(countdownRef.current!); return; }
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setCountdown(`${days}d ${String(hours).padStart(2,'0')}:${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`);
    };
    tick();
    countdownRef.current = setInterval(tick, 1000);
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proximoPartido?.id, proximos.length]);

  // Fetch eventos when switching to jugados tab
  useEffect(() => {
    if (tab !== 'jugados' || jugados.length === 0) return;
    const primeros5 = jugados.slice(0, 5);
    const idsAFetch = primeros5.filter((p) => !(p.id in eventos)).map((p) => p.id);
    if (idsAFetch.length === 0) return;

    Promise.all(
      idsAFetch.map((id) =>
        api.get<EventoPartido[]>(`/api/partidos/eventos/${id}`)
          .then(({ data }) => ({ id, data: Array.isArray(data) ? data : [] }))
          .catch(() => ({ id, data: [] }))
      )
    ).then((results) => {
      setEventos((prev) => {
        const next = { ...prev };
        results.forEach(({ id, data }) => { next[id] = data; });
        return next;
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, jugados.length]);

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
        <Text style={styles.competitionText}>⚽ {COMPETICION} · Temporada {TEMPORADA_CORTA}</Text>
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

      {offline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineBannerText}>📡 Sin conexión — mostrando datos guardados</Text>
        </View>
      )}
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
        ListHeaderComponent={
          tab === 'proximos' && (proximoPartido || proximos.length > 0) ? (
            (() => {
              const next = proximoPartido ?? proximos[0];
              return (
                <TouchableOpacity
                  style={styles.proximoCard}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('PartidoDetalle', { id: next.id })}
                >
                  <Text style={styles.proximoLabel}>⚡ PRÓXIMO PARTIDO</Text>
                  <View style={styles.proximoTeams}>
                    <View style={styles.proximoTeam}>
                      <EscudoImage uri={next.escudoLocal} nombre={next.equipoLocal} />
                      <Text style={styles.proximoTeamName} numberOfLines={2}>{next.equipoLocal}</Text>
                    </View>
                    <View style={styles.proximoCenter}>
                      <Text style={styles.proximoVs}>VS</Text>
                      <Text style={styles.proximoFecha}>{formatFecha(next.fecha)}</Text>
                      {next.hora ? <Text style={styles.proximoHora}>{next.hora}</Text> : null}
                      {countdown && (
                        <Text style={styles.proximoCountdown}>{countdown}</Text>
                      )}
                      <TouchableOpacity
                        style={styles.recordarBtn}
                        onPress={(e) => { e.stopPropagation?.(); programarRecordatorio(next); }}
                      >
                        <Text style={styles.recordarText}>🔔 Recordarme</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.proximoTeam}>
                      <EscudoImage uri={next.escudoVisitante} nombre={next.equipoVisitante} />
                      <Text style={styles.proximoTeamName} numberOfLines={2}>{next.equipoVisitante}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })()
          ) : null
        }
        ListEmptyComponent={
          !error ? <Text style={styles.empty}>Sin partidos programados</Text> : null
        }
        renderItem={({ item }) => {
          const eventosPartido = tab === 'jugados' ? (eventos[item.id] ?? []) : [];
          const eventosVisibles = eventosPartido.filter(
            (e) => e.tipo === 'gol' || e.tipo === 'tarjeta_amarilla' || e.tipo === 'tarjeta_roja'
          );
          return (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('PartidoDetalle', { id: item.id })}
            >
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
              {eventosVisibles.length > 0 && (
                <View style={styles.eventosRow}>
                  {eventosVisibles.map((ev) => (
                    <Text key={ev.id} style={styles.eventoText}>
                      {eventoEmoji(ev.tipo)} {ev.minuto}' {ev.jugador} ({ev.equipo})
                    </Text>
                  ))}
                </View>
              )}
            </TouchableOpacity>
          );
        }}
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
  proximoCard: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    padding: 18,
    marginBottom: 14,
  },
  proximoLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: 'bold', letterSpacing: 1, textAlign: 'center', marginBottom: 12 },
  proximoTeams: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  proximoTeam: { flex: 1, alignItems: 'center', gap: 6 },
  proximoTeamName: { color: colors.white, fontSize: 13, fontWeight: 'bold', textAlign: 'center', maxWidth: 90 },
  proximoCenter: { alignItems: 'center', paddingHorizontal: 8 },
  proximoVs: { fontSize: 20, fontWeight: 'bold', color: colors.secondary },
  proximoFecha: { color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: 4 },
  proximoHora: { color: colors.secondary, fontSize: 14, fontWeight: 'bold' },
  proximoCountdown: { color: colors.secondary, fontSize: 13, fontWeight: 'bold', marginTop: 4, letterSpacing: 0.5 },
  recordarBtn: {
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.secondary,
  },
  recordarText: { color: colors.secondary, fontSize: 11, fontWeight: 'bold' },
  eventosRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 3,
  },
  eventoText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  offlineBanner: {
    backgroundColor: '#fff3cd',
    borderColor: '#ffe69c',
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 8,
  },
  offlineBannerText: { color: '#7a5c00', fontSize: 12, textAlign: 'center', fontWeight: '600' },
});
