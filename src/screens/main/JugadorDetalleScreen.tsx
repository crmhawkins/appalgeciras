import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import api from '../../services/api';
import { CLUB_NOMBRE, TEMPORADA_CORTA } from '../../constants';

type JugadorDetalleRouteParams = {
  JugadorDetalle: { id: number };
};

interface EstadisticasJugador {
  goles?: number;
  asistencias?: number;
  minutos?: number;
  partidos?: number;
  titularidades?: number;
  tarjetasAmarillas?: number;
  tarjetasRojas?: number;
  disparosPuerta?: number;
  rating?: number;
}

interface JugadorDetalle {
  id: number;
  nombre: string;
  apellidos?: string;
  dorsal?: number;
  posicion?: string;
  sofascoreId?: number;
  foto?: string;
  nacionalidad?: string;
  edad?: number;
  altura?: string | number;
  peso?: string;
  piePref?: string;
  valorMercado?: number;
  estadisticas?: EstadisticasJugador;
}

function formatPiePref(p?: string): string | null {
  if (!p) return null;
  const map: Record<string, string> = { L: 'Izquierdo', R: 'Derecho', B: 'Ambidiestro' };
  return map[p] ?? p;
}

function formatValorMercado(v?: number): string | null {
  if (v == null || isNaN(Number(v))) return null;
  try {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(v));
  } catch {
    return `€${Number(v).toLocaleString('es-ES')}`;
  }
}

function formatAltura(a?: string | number): string | null {
  if (a == null || a === '') return null;
  const n = typeof a === 'number' ? a : parseFloat(a as string);
  if (!isNaN(n) && n > 100 && n < 250) {
    // cm -> "1,83 m"
    const m = (n / 100).toFixed(2).replace('.', ',');
    return `${m} m`;
  }
  return String(a);
}

interface StatItem {
  icon: string;
  label: string;
  value: number | string;
}

function fotoUrl(jugador: JugadorDetalle): string | null {
  if (jugador.foto) return jugador.foto;
  if (jugador.dorsal && jugador.dorsal >= 1 && jugador.dorsal <= 25) {
    return `https://backend-algeciras.hawkins.es/acf/2025/10/${jugador.dorsal}.png`;
  }
  if (jugador.sofascoreId) return `https://api.sofascore.app/api/v1/player/${jugador.sofascoreId}/image`;
  return null;
}

function nombreCompleto(jugador: JugadorDetalle): string {
  return jugador.apellidos ? `${jugador.nombre} ${jugador.apellidos}` : jugador.nombre;
}

function buildStats(est?: EstadisticasJugador | null, statsArr?: any[]): StatItem[] {
  // Backend returns jugador.stats as array (hasMany JugadorStats).
  // Use most recent stats entry if present, fallback to estadisticas object.
  let s: any = est ?? {};
  if (!est && statsArr && statsArr.length > 0) {
    s = statsArr[statsArr.length - 1];
  }
  if (!s || Object.keys(s).length === 0) return [];
  return [
    { icon: '⚽', label: 'Goles', value: s.goles ?? 0 },
    { icon: '🅰️', label: 'Asistencias', value: s.asistencias ?? 0 },
    // backend field is minutosJugados, screen previously used minutos
    { icon: '⏱', label: 'Minutos', value: s.minutosJugados ?? s.minutos ?? 0 },
    { icon: '📋', label: 'Partidos', value: s.partidos ?? 0 },
    { icon: '▶️', label: 'Titularidades', value: s.titularidades ?? 0 },
    { icon: '🟨', label: 'T. Amarillas', value: s.tarjetasAmarillas ?? 0 },
    { icon: '🟥', label: 'T. Rojas', value: s.tarjetasRojas ?? 0 },
    { icon: '🎯', label: 'Disparos', value: s.disparosPuerta ?? 0 },
    { icon: '⭐', label: 'Rating', value: s.rating != null ? Number(s.rating).toFixed(1) : '—' },
  ];
}

export default function JugadorDetalleScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<JugadorDetalleRouteParams, 'JugadorDetalle'>>();
  const { id } = route.params;

  const [jugador, setJugador] = useState<JugadorDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [fotoError, setFotoError] = useState(false);

  useEffect(() => {
    let mounted = true;
    api.get<any>(`/api/jugadores/${id}`)
      .then(({ data }) => {
        if (mounted) {
          // Backend returns { ok, jugador } — unwrap
          const j = data?.jugador ?? data;
          setJugador(j);
        }
      })
      .catch(() => {})
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [id]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!jugador) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>‹ Volver</Text>
        </TouchableOpacity>
        <View style={styles.centered}>
          <Text style={styles.errorText}>No se pudo cargar el jugador</Text>
        </View>
      </SafeAreaView>
    );
  }

  const url = fotoUrl(jugador);
  const stats = buildStats(jugador.estadisticas, (jugador as any).stats);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.hero}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>‹ Volver</Text>
          </TouchableOpacity>

          {url && !fotoError ? (
            <Image
              source={{ uri: url }}
              style={styles.fotoGrande}
              onError={() => setFotoError(true)}
            />
          ) : (
            <View style={styles.fotoPlaceholder}>
              <Text style={styles.fotoPlaceholderText}>{jugador.nombre.charAt(0).toUpperCase()}</Text>
            </View>
          )}

          <Text style={styles.nombre}>{nombreCompleto(jugador)}</Text>
          <Text style={styles.clubLabel}>{CLUB_NOMBRE} · {TEMPORADA_CORTA}</Text>

          <View style={styles.badgesRow}>
            {jugador.dorsal != null && (
              <View style={styles.badge}>
                <Text style={styles.badgeLabel}>Dorsal</Text>
                <Text style={styles.badgeValue}>#{jugador.dorsal}</Text>
              </View>
            )}
            {jugador.posicion && (
              <View style={[styles.badge, styles.badgeSecondary]}>
                <Text style={styles.badgeLabel}>Posición</Text>
                <Text style={styles.badgeValueSecondary}>{jugador.posicion}</Text>
              </View>
            )}
            {jugador.edad != null && (
              <View style={[styles.badge, styles.badgeSecondary]}>
                <Text style={styles.badgeLabel}>Edad</Text>
                <Text style={styles.badgeValueSecondary}>{jugador.edad} años</Text>
              </View>
            )}
          </View>
        </View>

        {/* Info extra */}
        {(jugador.nacionalidad || jugador.altura || jugador.peso || jugador.piePref || jugador.valorMercado) && (
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Información</Text>
            <View style={styles.infoRow}>
              {jugador.nacionalidad && (
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Nacionalidad</Text>
                  <Text style={styles.infoValue}>{jugador.nacionalidad}</Text>
                </View>
              )}
              {formatAltura(jugador.altura) && (
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Altura</Text>
                  <Text style={styles.infoValue}>{formatAltura(jugador.altura)}</Text>
                </View>
              )}
              {jugador.peso && (
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Peso</Text>
                  <Text style={styles.infoValue}>{jugador.peso}</Text>
                </View>
              )}
            </View>
            {(formatPiePref(jugador.piePref) || formatValorMercado(jugador.valorMercado)) && (
              <View style={[styles.infoRow, { marginTop: 12 }]}>
                {formatPiePref(jugador.piePref) && (
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Pie preferente</Text>
                    <Text style={styles.infoValue}>{formatPiePref(jugador.piePref)}</Text>
                  </View>
                )}
                {formatValorMercado(jugador.valorMercado) && (
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Valor de mercado</Text>
                    <Text style={styles.infoValue}>{formatValorMercado(jugador.valorMercado)}</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* Estadísticas */}
        {stats.length > 0 && (
          <View style={styles.statsSection}>
            <Text style={styles.sectionTitle}>Estadísticas</Text>
            <View style={styles.statsGrid}>
              {stats.map((s) => (
                <View key={s.label} style={styles.statCard}>
                  <Text style={styles.statIcon}>{s.icon}</Text>
                  <Text style={styles.statValue}>{s.value}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {stats.length === 0 && !jugador.estadisticas && (
          <View style={styles.infoSection}>
            <Text style={styles.emptyStats}>Sin estadísticas disponibles esta temporada</Text>
          </View>
        )}

        {/* Fan of the Match */}
        <View style={styles.fanCard}>
          <Text style={styles.fanIcon}>🏆</Text>
          <Text style={styles.fanTitle}>Nominaciones Fan of the Match</Text>
          <Text style={styles.fanSub}>Estadística disponible próximamente</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingBottom: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: colors.textSecondary, fontSize: 15 },

  hero: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    paddingBottom: 28,
    paddingTop: 8,
  },
  backBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backText: { color: colors.white, fontSize: 16, fontWeight: '600' },

  fotoGrande: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 3,
    borderColor: colors.white,
    marginTop: 8,
    marginBottom: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  fotoPlaceholder: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 3,
    borderColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 14,
  },
  fotoPlaceholderText: { color: colors.white, fontSize: 42, fontWeight: 'bold' },

  nombre: {
    color: colors.white,
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  clubLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginBottom: 14 },

  badgesRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', justifyContent: 'center', paddingHorizontal: 16 },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  badgeSecondary: { backgroundColor: 'rgba(255,255,255,0.1)' },
  badgeLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 10, marginBottom: 2 },
  badgeValue: { color: colors.white, fontWeight: 'bold', fontSize: 16 },
  badgeValueSecondary: { color: colors.white, fontWeight: '600', fontSize: 14 },

  infoSection: {
    backgroundColor: colors.white,
    margin: 16,
    marginBottom: 0,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    paddingLeft: 8,
  },
  infoRow: { flexDirection: 'row', gap: 16 },
  infoItem: { flex: 1 },
  infoLabel: { fontSize: 11, color: colors.textSecondary, marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: '600', color: colors.text },

  statsSection: {
    backgroundColor: colors.white,
    margin: 16,
    marginBottom: 0,
    borderRadius: 12,
    padding: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    width: '30%',
    backgroundColor: colors.background,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statIcon: { fontSize: 22, marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: 'bold', color: colors.primary, marginBottom: 2 },
  statLabel: { fontSize: 10, color: colors.textSecondary, textAlign: 'center' },

  emptyStats: { color: colors.textSecondary, textAlign: 'center', paddingVertical: 8, fontSize: 13 },

  fanCard: {
    margin: 16,
    marginBottom: 0,
    backgroundColor: '#fff8e1',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.secondary,
  },
  fanIcon: { fontSize: 40, marginBottom: 8 },
  fanTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#7a5c00',
    textAlign: 'center',
    marginBottom: 4,
  },
  fanSub: {
    fontSize: 12,
    color: '#9c7a14',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
