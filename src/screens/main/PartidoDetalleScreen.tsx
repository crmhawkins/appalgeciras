import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  TouchableOpacity, Image, Share, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import * as Calendar from 'expo-calendar';
import api from '../../services/api';
import { colors } from '../../theme/colors';
import { Partido } from '../../types';
import { ESCUDO_URL, COMPETICION } from '../../constants';
import { MainStackParamList } from '../../navigation/MainStack';
import { notificarGol } from '../../services/marcadorPolling';

interface EventoPartido {
  id: number;
  minuto: number;
  tipo: string; // 'gol' | 'tarjeta_amarilla' | 'tarjeta_roja' | 'sustitucion'
  jugador: string;
  jugadorEntra?: string;
  jugadorSale?: string;
  equipo: string;
}

function eventoEmoji(tipo: string): string {
  if (tipo === 'gol') return '⚽';
  if (tipo === 'tarjeta_amarilla') return '🟨';
  if (tipo === 'tarjeta_roja') return '🟥';
  if (tipo === 'sustitucion') return '🔄';
  return '•';
}

function EscudoImage({ uri, nombre, size = 56 }: { uri?: string; nombre: string; size?: number }) {
  const [error, setError] = useState(false);
  const isAlgeciras = nombre?.toLowerCase().includes('algeciras');
  const resolvedUri = uri || (isAlgeciras ? ESCUDO_URL : undefined);
  const initials = nombre
    ? nombre.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : '?';
  if (!resolvedUri || error) {
    return (
      <View style={[styles.escudoPlaceholder, { width: size, height: size, borderRadius: size / 2 }]}>
        <Text style={styles.escudoInitials}>{initials}</Text>
      </View>
    );
  }
  return (
    <Image
      source={{ uri: resolvedUri }}
      style={{ width: size, height: size, resizeMode: 'contain' }}
      onError={() => setError(true)}
    />
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

export default function PartidoDetalleScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<MainStackParamList, 'PartidoDetalle'>>();
  const { id } = route.params;

  const [partido, setPartido] = useState<Partido | null>(null);
  const [eventos, setEventos] = useState<EventoPartido[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const marcadorPrevio = useRef<string | null | undefined>(undefined);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Partido activo = tiene fecha de hoy y sin marcador aún, o marcador en formato X-Y con partido reciente
  function esPartidoActivo(p: Partido): boolean {
    const hoy = new Date().toISOString().split('T')[0];
    const fechaPartido = p.fecha.split('T')[0];
    return fechaPartido === hoy;
  }

  const pollMarcador = useCallback(async (p: Partido) => {
    try {
      const { data } = await api.get<any>(`/api/partidos/${p.id}`);
      const nuevo: Partido = data?.partido ?? data;
      if (!nuevo) return;
      const marcadorNuevo = nuevo.marcador ?? null;
      // marcadorPrevio.current === undefined means first load — just store, no notification
      if (
        marcadorPrevio.current !== undefined &&
        marcadorNuevo !== null &&
        marcadorNuevo !== marcadorPrevio.current
      ) {
        await notificarGol(nuevo.equipoLocal, nuevo.equipoVisitante, marcadorNuevo);
      }
      marcadorPrevio.current = marcadorNuevo;
      setPartido(nuevo);
      const evs = data?.eventos ?? [];
      if (Array.isArray(evs) && evs.length > 0) setEventos(evs);
    } catch {
      // silent — no disturb UX on poll error
    }
  }, []);

  const load = useCallback(async () => {
    setError(null);
    try {
      // Single request returns partido + eventos
      const { data } = await api.get<any>(`/api/partidos/${id}`);
      setPartido(data?.partido ?? null);
      const evs = data?.eventos ?? [];
      setEventos(Array.isArray(evs) ? evs : []);
    } catch {
      // Fallback: load from list + separate eventos
      try {
        const [listRes, eRes] = await Promise.all([
          api.get<Partido[] | { partidos: Partido[] }>('/api/partidos'),
          api.get<EventoPartido[]>(`/api/partidos/eventos/${id}`).catch(() => ({ data: [] as EventoPartido[] })),
        ]);
        const lista: Partido[] = Array.isArray(listRes.data) ? listRes.data : ((listRes.data as any).partidos ?? []);
        setPartido(lista.find((p) => p.id === id) ?? null);
        setEventos(Array.isArray(eRes.data) ? eRes.data : []);
      } catch (e: any) {
        setError(e?.response?.data?.msg || e?.message || 'Error cargando partido');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Start/stop polling when partido changes
  useEffect(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    if (partido && esPartidoActivo(partido)) {
      // First store current marcador without notification
      marcadorPrevio.current = partido.marcador ?? null;
      pollingRef.current = setInterval(() => {
        pollMarcador(partido);
      }, 30000); // poll every 30s
    }
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [partido?.id, partido?.marcador, pollMarcador]);

  const addToCalendar = useCallback(async () => {
    if (!partido) return;
    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Necesitamos acceso al calendario para añadir el evento.');
        return;
      }
      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      let calendarId: string | undefined;
      const editable = calendars.find((c: Calendar.Calendar) => c.allowsModifications);
      if (editable) {
        calendarId = editable.id;
      } else {
        calendarId = await Calendar.createCalendarAsync({
          title: 'Algeciras CF',
          color: colors.primary,
          entityType: Calendar.EntityTypes.EVENT,
          sourceId: undefined,
          source: { isLocalAccount: true, name: 'Algeciras CF', type: Calendar.CalendarType.LOCAL },
          name: 'algecirascf',
          ownerAccount: 'algecirascf',
          accessLevel: Calendar.CalendarAccessLevel.OWNER,
        });
      }
      const rival = partido.equipoLocal.toLowerCase().includes('algeciras')
        ? partido.equipoVisitante
        : partido.equipoLocal;
      const startDate = new Date(partido.fecha);
      if (partido.hora) {
        const [h, m] = partido.hora.split(':');
        startDate.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
      }
      const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
      await Calendar.createEventAsync(calendarId, {
        title: `⚽ Algeciras CF vs ${rival}`,
        startDate,
        endDate,
        notes: `Primera RFEF — ${COMPETICION.split(' · ')[0]}`,
        timeZone: 'Europe/Madrid',
      });
      Alert.alert('Partido añadido al calendario');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'No se pudo añadir al calendario');
    }
  }, [partido]);

  const handleShare = useCallback(async () => {
    if (!partido) return;
    const marcador = partido.marcador ?? 'vs';
    const rival = partido.equipoLocal === 'Algeciras C.F.' || partido.equipoLocal.toLowerCase().includes('algeciras')
      ? partido.equipoVisitante
      : partido.equipoLocal;
    const competicion = COMPETICION.split(' · ')[0];
    try {
      await Share.share({
        message: `Algeciras CF ${marcador} ${rival} — ${competicion}\n¡Vamos Algeciras! 🔴⚪`,
        title: 'Resultado Algeciras CF',
      });
    } catch {}
  }, [partido]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!partido) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>← Volver</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Partido</Text>
          <View style={{ width: 60 }} />
        </View>
        <View style={styles.center}>
          <Text style={styles.empty}>{error ?? 'Partido no encontrado'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const tieneMarcador = partido.marcador != null && partido.marcador !== '';
  const eventosOrdenados = [...eventos].sort((a, b) => (a.minuto ?? 0) - (b.minuto ?? 0));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Partido</Text>
        <TouchableOpacity onPress={handleShare} style={styles.shareBtn}>
          <Text style={styles.shareText}>Compartir</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {/* Marcador */}
        <View style={styles.scoreCard}>
          <View style={styles.scoreTeams}>
            <View style={styles.teamBlock}>
              <EscudoImage uri={partido.escudoLocal} nombre={partido.equipoLocal} size={64} />
              <Text style={styles.teamName} numberOfLines={2}>{partido.equipoLocal}</Text>
            </View>
            <View style={styles.scoreCenter}>
              {tieneMarcador ? (
                <Text style={styles.score}>{partido.marcador}</Text>
              ) : (
                <Text style={styles.scorePending}>⏰ Partido pendiente</Text>
              )}
            </View>
            <View style={styles.teamBlock}>
              <EscudoImage uri={partido.escudoVisitante} nombre={partido.equipoVisitante} size={64} />
              <Text style={styles.teamName} numberOfLines={2}>{partido.equipoVisitante}</Text>
            </View>
          </View>
          <Text style={styles.matchMeta}>
            {formatFecha(partido.fecha)}
            {partido.hora ? ` • ${partido.hora}` : ''}
            {' • '}
            {COMPETICION.split(' · ')[0]}
          </Text>
          {!tieneMarcador && (
            <TouchableOpacity style={styles.calendarBtn} onPress={addToCalendar}>
              <Text style={styles.calendarBtnText}>📅 Añadir al calendario</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Eventos */}
        {tieneMarcador && (
          <View style={styles.eventsCard}>
            <Text style={styles.eventsTitle}>EVENTOS DEL PARTIDO</Text>
            <View style={styles.divider} />
            {eventosOrdenados.length === 0 ? (
              <Text style={styles.empty}>Sin eventos registrados para este partido</Text>
            ) : (
              eventosOrdenados.map((ev) => (
                <View key={ev.id} style={styles.eventRow}>
                  <Text style={styles.eventEmoji}>{eventoEmoji(ev.tipo)}</Text>
                  <Text style={styles.eventMin}>{ev.minuto}'</Text>
                  <View style={styles.eventInfo}>
                    {ev.tipo === 'sustitucion' ? (
                      <Text style={styles.eventText} numberOfLines={2}>
                        {(ev.jugadorEntra ?? ev.jugador)} entra ← {(ev.jugadorSale ?? '')}
                      </Text>
                    ) : (
                      <Text style={styles.eventText} numberOfLines={2}>
                        {ev.jugador} {ev.equipo ? `(${ev.equipo})` : ''}
                      </Text>
                    )}
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  backBtn: { paddingVertical: 4, paddingHorizontal: 8 },
  backText: { color: colors.white, fontSize: 14, fontWeight: '600' },
  headerTitle: { color: colors.white, fontSize: 18, fontWeight: 'bold' },
  shareBtn: { paddingVertical: 4, paddingHorizontal: 8 },
  shareText: { color: colors.secondary, fontSize: 13, fontWeight: '600' },
  container: { padding: 16, paddingBottom: 32 },

  scoreCard: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
  },
  scoreTeams: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  teamBlock: { flex: 1, alignItems: 'center', gap: 8 },
  teamName: {
    color: colors.white,
    fontSize: 13,
    fontWeight: 'bold',
    textAlign: 'center',
    maxWidth: 100,
  },
  scoreCenter: { alignItems: 'center', paddingHorizontal: 8 },
  score: { color: colors.secondary, fontSize: 36, fontWeight: 'bold' },
  scorePending: { color: colors.secondary, fontSize: 14, fontWeight: 'bold', textAlign: 'center' },
  matchMeta: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
  },
  escudoPlaceholder: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  escudoInitials: { fontSize: 16, fontWeight: 'bold', color: colors.white },

  eventsCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
  },
  eventsTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.primary,
    letterSpacing: 1,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 10,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
  },
  eventEmoji: { fontSize: 18, width: 24 },
  eventMin: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: 'bold',
    width: 36,
  },
  eventInfo: { flex: 1 },
  eventText: { fontSize: 14, color: colors.text },
  empty: { textAlign: 'center', color: colors.textSecondary, paddingVertical: 12 },
  calendarBtn: {
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  calendarBtnText: { color: colors.white, fontWeight: '600', fontSize: 14 },
});
