import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Image, RefreshControl,
} from 'react-native';

// Fila de patrocinadores con scroll manual.
//
// HISTÓRICO: antes esto era un AutoScrollRow con setInterval(16ms) llamando
// scrollTo() en cada tick. Saturaba el JS thread en iOS y dejaba la UI sin
// responder a toques — el usuario reportó "no es clicable nada del menú
// principal" el 28/05/2026. Reemplazado por un ScrollView estándar con
// scroll manual del usuario.
function SponsorsRow({ children, gap = 10 }: {
  children: React.ReactNode[];
  gap?: number;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap, paddingVertical: 4, paddingHorizontal: 2 }}
    >
      {children}
    </ScrollView>
  );
}
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { getCached, setCached, getCachedStale } from '../../services/cache';
import { ClasificacionItem, Noticia } from '../../types';
import { ESCUDO_URL, COMPETICION, TEMPORADA, Sponsor, SPONSORS_DESTACADOS, SPONSORS_PATROCINADORES, SPONSORS_PROVEEDORES } from '../../constants';
import { useCountdown } from '../../hooks/useCountdown';


const CATEGORIA_COLORS: Record<string, string> = {
  fichaje: '#2196F3',
  partido: '#4CAF50',
  comunicado: '#FF9800',
  lesion: '#F44336',
  galeria: '#9C27B0',
  evento: '#00BCD4',
  otro: '#607D8B',
};

const CATEGORIA_LABELS: Record<string, string> = {
  fichaje: 'Fichaje',
  partido: 'Partido',
  comunicado: 'Comunicado',
  lesion: 'Lesión',
  galeria: 'Galería',
  evento: 'Evento',
  otro: 'Noticia',
};

interface PartidoAPI {
  id: number;
  // Backend uses equipoLocal/equipoVisitante (Sequelize model field names)
  equipoLocal: string;
  equipoVisitante: string;
  escudoLocal?: string;
  escudoVisitante?: string;
  fecha: string;
  hora?: string;
  // Backend uses marcador string e.g. "2-1", no separate resultado_local/visitante fields
  marcador?: string | null;
}

function MatchEscudo({ uri, nombre }: { uri?: string; nombre: string }) {
  const [error, setError] = useState(false);
  const isAlgeciras = nombre?.toLowerCase().includes('algeciras');
  const resolvedUri = uri || (isAlgeciras ? ESCUDO_URL : undefined);
  if (!resolvedUri || error) {
    const initials = nombre
      ? nombre.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
      : '?';
    return (
      <View style={styles.matchEscudoPlaceholder}>
        <Text style={styles.matchEscudoText}>{initials}</Text>
      </View>
    );
  }
  return (
    <Image
      source={{ uri: resolvedUri }}
      style={styles.matchEscudoImg}
      resizeMode="contain"
      onError={() => setError(true)}
      accessibilityLabel={nombre}
    />
  );
}

export default function HomeScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const [clasificacion, setClasificacion] = useState<ClasificacionItem[]>([]);
  const [loadingClasif, setLoadingClasif] = useState(true);
  const [escudoError, setEscudoError] = useState(false);
  const [partido, setPartido] = useState<PartidoAPI | null>(null);
  const [loadingPartido, setLoadingPartido] = useState(true);
  const [noticiasDestacadas, setNoticiasDestacadas] = useState<Noticia[]>([]);
  const [loadingDestacadas, setLoadingDestacadas] = useState(true);
  const [sponsorsDestacados]    = useState<Sponsor[]>(SPONSORS_DESTACADOS);
  const [sponsorsPatrocinadores]= useState<Sponsor[]>(SPONSORS_PATROCINADORES);
  const [sponsorsProveedores]   = useState<Sponsor[]>(SPONSORS_PROVEEDORES);
  const [offline, setOffline] = useState(false);

  const toArray = <T,>(v: unknown): T[] => Array.isArray(v) ? v as T[] : [];

  const loadClasificacion = useCallback(async (signal?: AbortSignal) => {
    const cached = await getCached<ClasificacionItem[]>('clasificacion');
    if (cached) setClasificacion(toArray<ClasificacionItem>(cached));
    try {
      const { data } = await api.get<any>('/api/clasificacion', { signal });
      const list = toArray<ClasificacionItem>((data as any)?.clasificacion ?? data);
      setClasificacion(list);
      await setCached('clasificacion', list);
    } catch (e: any) {
      if (e?.name === 'CanceledError' || e?.name === 'AbortError') return;
      const stale = await getCachedStale<ClasificacionItem[]>('clasificacion');
      if (stale) { setClasificacion(toArray<ClasificacionItem>(stale)); setOffline(true); }
    }
    finally { setLoadingClasif(false); }
  }, []);

  const loadPartido = useCallback(async (signal?: AbortSignal) => {
    const cached = await getCached<PartidoAPI>('home_partido');
    if (cached) setPartido(cached);
    try {
      const { data } = await api.get<any>('/api/partidos', { signal });
      // Backend returns { partidos: [...], proximoPartido: {...} }
      if ((data as any)?.proximoPartido) {
        const next = (data as any).proximoPartido as PartidoAPI;
        setPartido(next);
        await setCached('home_partido', next);
        return;
      }
      const list: PartidoAPI[] = Array.isArray(data) ? data : ((data as any)?.partidos ?? []);
      if (list.length === 0) return;
      const today = new Date().toISOString().split('T')[0];
      // Partidos con marcador = ya jugados
      const jugados = list.filter(p => p.marcador != null && p.marcador !== '');
      let chosen: PartidoAPI | null = null;
      if (jugados.length > 0) {
        const sorted = jugados.sort(
          (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime(),
        );
        chosen = sorted[0];
      } else {
        // No played match — show next upcoming
        const proximos = list
          .filter(p => !p.marcador && p.fecha >= today)
          .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
        chosen = proximos[0] ?? list[0] ?? null;
      }
      setPartido(chosen);
      if (chosen) await setCached('home_partido', chosen);
    } catch (e: any) {
      if (e?.name === 'CanceledError' || e?.name === 'AbortError') return;
      const stale = await getCachedStale<PartidoAPI>('home_partido');
      if (stale) { setPartido(stale); setOffline(true); }
    }
    finally { setLoadingPartido(false); }
  }, []);

  const loadDestacadas = useCallback(async (signal?: AbortSignal) => {
    const cached = await getCached<Noticia[]>('home_destacadas');
    if (cached) setNoticiasDestacadas(cached);
    try {
      const { data } = await api.get<{ noticias: Noticia[] }>('/api/noticias/destacadas', { signal });
      const list = (data?.noticias ?? []).slice(0, 3);
      setNoticiasDestacadas(list);
      await setCached('home_destacadas', list);
    } catch (e: any) {
      if (e?.name === 'CanceledError' || e?.name === 'AbortError') return;
      const stale = await getCachedStale<Noticia[]>('home_destacadas');
      if (stale) { setNoticiasDestacadas(stale); setOffline(true); }
    }
    finally { setLoadingDestacadas(false); }
  }, []);

  // FIX-4: AbortController cleanup to prevent race conditions
  useEffect(() => {
    const controller = new AbortController();
    loadClasificacion(controller.signal);
    loadPartido(controller.signal);
    loadDestacadas(controller.signal);
    return () => controller.abort();
  }, [loadClasificacion, loadPartido, loadDestacadas]);


  const [refreshing, setRefreshing] = useState(false);
  const [verTodaClasif, setVerTodaClasif] = useState(false);
  const [offlineTs, setOfflineTs] = useState<number | null>(null);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setLoadingClasif(true);
    setLoadingPartido(true);
    setLoadingDestacadas(true);
    await Promise.all([loadClasificacion(), loadPartido(), loadDestacadas()]);
    setRefreshing(false);
  }, [loadClasificacion, loadPartido, loadDestacadas]);

  const partidoJugado =
    partido !== null &&
    (partido.marcador != null && partido.marcador !== '');

  const countdownTarget = useMemo(() => {
    if (!partido || partidoJugado) return null;
    const d = new Date(partido.fecha);
    if (partido.hora) {
      const [h, m] = partido.hora.split(':');
      d.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
    }
    return d;
  }, [partido?.id, partidoJugado]);
  const countdown = useCountdown(countdownTarget);

  // Cargar timestamp de caché stale para banner offline
  useEffect(() => {
    if (!offline) { setOfflineTs(null); return; }
    import('../../services/cache').then(({ getCachedStaleWithTs }) => {
      if (!getCachedStaleWithTs) return;
      getCachedStaleWithTs('home_partido').then((res: any) => {
        if (res?.ts) setOfflineTs(res.ts);
      });
    }).catch(() => {});
  }, [offline]);

  // Tanto Abono como Entrada llevan al plano del estadio (WebView del web /estadio).
  // La diferencia es el `type` query param que la web lee para mostrar precio
  // de abono (temporada completa) o precio de entrada (un partido).
  const goAbonos = () => navigation.navigate('EstadioPlano', { type: 'abono' });
  const goEntradas = () => navigation.navigate('EstadioPlano', { type: 'entrada' });
  const goPartidos = () => navigation.navigate('Partidos');
  const goRenovar = () => navigation.navigate('RenovarAbono');
  const goNoticias = () => navigation.navigate('NoticiasTab');

  const formatFecha = (fechaStr: string) => {
    try {
      const d = new Date(fechaStr);
      return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return fechaStr;
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
      >
        {offline && (
          <View style={styles.offlineBanner}>
            <Text style={styles.offlineBannerText}>
              📡 Sin conexión —{' '}
              {offlineTs
                ? `Datos de hace ${Math.round((Date.now() - offlineTs) / 60000)} min`
                : 'mostrando datos guardados'}
            </Text>
          </View>
        )}
        {/* HEADER */}
        <View style={styles.header}>
          {escudoError ? (
            <View style={styles.escudoPlaceholder}>
              <Text style={styles.escudoText}>ACF</Text>
            </View>
          ) : (
            <Image
              source={{ uri: ESCUDO_URL }}
              style={styles.escudoImg}
              resizeMode="contain"
              onError={() => setEscudoError(true)}
              accessibilityLabel="Escudo Algeciras CF"
            />
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.clubName}>Algeciras CF</Text>
            <Text style={styles.welcome}>
              {user ? `Hola, ${user.nombre || user.email}` : 'Bienvenido, aficionado'}
            </Text>
          </View>
        </View>

        {/* ACTION BUTTONS */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={goAbonos}>
            <Text style={styles.actionIcon}>🎫</Text>
            <Text style={styles.actionLabel}>Abono</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={goEntradas}>
            <Text style={styles.actionIcon}>🎟️</Text>
            <Text style={styles.actionLabel}>Entrada</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnSecondary]} onPress={goPartidos}>
            <Text style={styles.actionIcon}>⚽</Text>
            <Text style={[styles.actionLabel, styles.actionLabelSecondary]}>Partidos</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnSecondary]} onPress={goRenovar}>
            <Text style={styles.actionIcon}>🔁</Text>
            <Text style={[styles.actionLabel, styles.actionLabelSecondary]}>Renovar</Text>
          </TouchableOpacity>
        </View>

        {/* ÚLTIMO / PRÓXIMO PARTIDO */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {partidoJugado ? 'Último Partido' : 'Próximo Partido'}
          </Text>
          {loadingPartido ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 12 }} />
          ) : partido === null ? (
            <Text style={styles.emptyText}>Sin datos de partidos</Text>
          ) : partidoJugado ? (
            /* RESULTADO */
            <TouchableOpacity
              style={styles.matchCard}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('PartidoDetalle', { id: partido.id })}
            >
              <View style={styles.matchTeamBlock}>
                <View style={styles.matchTeamRow}>
                  <MatchEscudo uri={partido.escudoLocal} nombre={partido.equipoLocal} />
                  <Text style={styles.matchTeam} numberOfLines={2}>{partido.equipoLocal}</Text>
                </View>
              </View>
              <View style={styles.matchScoreBlock}>
                <Text style={styles.matchScore}>{partido.marcador}</Text>
                <Text style={styles.matchFecha}>{formatFecha(partido.fecha)}</Text>
              </View>
              <View style={styles.matchTeamBlock}>
                <View style={[styles.matchTeamRow, styles.matchTeamRowRight]}>
                  <Text style={[styles.matchTeam, styles.matchTeamRight]} numberOfLines={2}>
                    {partido.equipoVisitante}
                  </Text>
                  <MatchEscudo uri={partido.escudoVisitante} nombre={partido.equipoVisitante} />
                </View>
              </View>
            </TouchableOpacity>
          ) : (
            /* PRÓXIMO */
            <TouchableOpacity
              style={styles.matchCard}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('PartidoDetalle', { id: partido.id })}
            >
              <View style={styles.matchTeamBlock}>
                <View style={styles.matchTeamRow}>
                  <MatchEscudo uri={partido.escudoLocal} nombre={partido.equipoLocal} />
                  <Text style={styles.matchTeam} numberOfLines={2}>{partido.equipoLocal}</Text>
                </View>
              </View>
              <View style={styles.matchScoreBlock}>
                <Text style={styles.matchVs}>VS</Text>
                <Text style={styles.matchFecha}>{formatFecha(partido.fecha)}</Text>
                {countdown && (
                  <Text style={styles.matchCountdown}>{countdown}</Text>
                )}
              </View>
              <View style={styles.matchTeamBlock}>
                <View style={[styles.matchTeamRow, styles.matchTeamRowRight]}>
                  <Text style={[styles.matchTeam, styles.matchTeamRight]} numberOfLines={2}>
                    {partido.equipoVisitante}
                  </Text>
                  <MatchEscudo uri={partido.escudoVisitante} nombre={partido.equipoVisitante} />
                </View>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* PATROCINADORES */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Patrocinadores</Text>

          {/* Fila 1 — Destacados */}
          <Text style={styles.sponsorsRowLabel}>Patrocinadores Destacados</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sponsorsRow}>
            {sponsorsDestacados.map((s) => (
              <View key={s.name} style={[styles.sponsorCard, styles.sponsorCardLg, s.dark && styles.sponsorCardDark]}>
                <Image source={{ uri: s.url }} style={styles.sponsorImgLg} resizeMode="contain" />
              </View>
            ))}
          </ScrollView>

          {/* Fila 2 — Patrocinadores */}
          <Text style={styles.sponsorsRowLabel}>Patrocinadores</Text>
          <SponsorsRow gap={10}>
            {sponsorsPatrocinadores.map((s) => (
              <View key={s.name} style={[styles.sponsorCard, s.dark && styles.sponsorCardDark]}>
                <Image source={{ uri: s.url }} style={styles.sponsorImg} resizeMode="contain" />
              </View>
            ))}
          </SponsorsRow>

          {/* Fila 3 — Proveedores */}
          <Text style={styles.sponsorsRowLabel}>Proveedores</Text>
          <SponsorsRow gap={10}>
            {sponsorsProveedores.map((s) => (
              <View key={s.name} style={[styles.sponsorCard, styles.sponsorCardSm, s.dark && styles.sponsorCardDark]}>
                <Image source={{ uri: s.url }} style={styles.sponsorImgSm} resizeMode="contain" />
              </View>
            ))}
          </SponsorsRow>
        </View>

        {/* ÚLTIMAS NOTICIAS */}
        <TouchableOpacity style={styles.noticiasBanner} onPress={goNoticias} activeOpacity={0.82}>
          <View style={styles.noticiasInner}>
            <Text style={styles.noticiasIcon}>📰</Text>
            <View style={styles.noticiasTextBlock}>
              <Text style={styles.noticiasTitle}>Últimas Noticias</Text>
              <Text style={styles.noticiasSub}>Blog oficial del Algeciras CF</Text>
            </View>
            <Text style={styles.noticiasArrow}>›</Text>
          </View>
        </TouchableOpacity>

        {/* NOTICIAS DESTACADAS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Noticias Destacadas</Text>
          {loadingDestacadas ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 12 }} />
          ) : noticiasDestacadas.length === 0 ? (
            <Text style={styles.emptyText}>Sin noticias destacadas</Text>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.destacadasRow}
            >
              {noticiasDestacadas.map(n => {
                const catColor = CATEGORIA_COLORS[n.categoria] ?? '#607D8B';
                const catLabel = CATEGORIA_LABELS[n.categoria] ?? n.categoria;
                return (
                  <TouchableOpacity
                    key={n.id}
                    style={styles.destacadaCard}
                    onPress={() => navigation.navigate('NoticiaDetalle', { slug: n.slug })}
                    activeOpacity={0.85}
                  >
                    {n.imagen ? (
                      <Image source={{ uri: n.imagen }} style={styles.destacadaImage} resizeMode="cover" accessibilityLabel={n.titulo} />
                    ) : (
                      <View style={[styles.destacadaImage, { backgroundColor: catColor + '55' }]} />
                    )}
                    <View style={styles.destacadaOverlay}>
                      <View style={[styles.destacadaBadge, { backgroundColor: catColor }]}>
                        <Text style={styles.destacadaBadgeText}>{catLabel}</Text>
                      </View>
                      <Text style={styles.destacadaTitulo} numberOfLines={2}>{n.titulo}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* CLASIFICACIÓN */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Clasificación</Text>
          {loadingClasif ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 12 }} />
          ) : clasificacion.length === 0 ? (
            <Text style={styles.emptyText}>Sin datos de clasificación</Text>
          ) : (
            <View style={styles.table}>
              <View style={[styles.tableRow, styles.tableHeader]}>
                <Text style={[styles.cell, styles.cellPos, styles.headerCell]}>#</Text>
                <Text style={[styles.cellEquipo, styles.headerCell]}>Equipo</Text>
                <Text style={[styles.cell, styles.headerCell]}>PJ</Text>
                <Text style={[styles.cell, styles.headerCell]}>G</Text>
                <Text style={[styles.cell, styles.headerCell]}>E</Text>
                <Text style={[styles.cell, styles.headerCell]}>D</Text>
                <Text style={[styles.cell, styles.cellPts, styles.headerCell]}>Pts</Text>
              </View>
              {(verTodaClasif ? clasificacion : clasificacion.slice(0, 10)).map((item) => {
                const isAlgeciras = item.equipo?.toLowerCase().includes('algeciras');
                return (
                  <View
                    key={item.id}
                    style={[styles.tableRow, isAlgeciras && styles.highlightRow]}
                  >
                    <Text style={[styles.cell, styles.cellPos, isAlgeciras && styles.highlightText]}>
                      {item.posicion}
                    </Text>
                    <View style={styles.equipoCell}>
                      {item.escudo ? (
                        <Image source={{ uri: item.escudo }} style={styles.escudoSmall} />
                      ) : null}
                      <Text
                        style={[styles.cellEquipoText, isAlgeciras && styles.highlightText]}
                        numberOfLines={1}
                      >
                        {item.equipo}
                      </Text>
                    </View>
                    <Text style={[styles.cell, isAlgeciras && styles.highlightText]}>{item.pj}</Text>
                    <Text style={[styles.cell, isAlgeciras && styles.highlightText]}>{item.g ?? '—'}</Text>
                    <Text style={[styles.cell, isAlgeciras && styles.highlightText]}>{item.e ?? '—'}</Text>
                    <Text style={[styles.cell, isAlgeciras && styles.highlightText]}>{item.d ?? '—'}</Text>
                    <Text style={[styles.cell, styles.cellPts, styles.ptsText, isAlgeciras && styles.highlightPts]}>
                      {item.puntos}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
          {clasificacion.length > 10 && (
            <TouchableOpacity style={styles.verTodaBtn} onPress={() => setVerTodaClasif(v => !v)}>
              <Text style={styles.verTodaText}>
                {verTodaClasif ? '▲ Ver menos' : `▼ Ver toda la clasificación (${clasificacion.length} equipos)`}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { paddingHorizontal: 16, paddingBottom: 24, paddingTop: 0 },
  offlineBanner: {
    backgroundColor: '#fff3cd',
    borderColor: '#ffe69c',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 8,
    marginBottom: 4,
  },
  offlineBannerText: { color: '#7a5c00', fontSize: 12, textAlign: 'center', fontWeight: '600' },
  // HEADER
  header: {
    backgroundColor: colors.primary,
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  escudoPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.secondary,
  },
  escudoText: { color: colors.secondary, fontWeight: 'bold', fontSize: 14 },
  escudoImg: { width: 60, height: 60 },
  clubName: { color: colors.white, fontSize: 20, fontWeight: 'bold' },
  welcome: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 2 },

  // ACTIONS
  // 4 botones — paddingVertical/gap reducidos para que quepan en móviles
  // pequeños sin desbordar. flex:1 + flexBasis:0 evita overflow horizontal.
  actionsRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  actionBtn: {
    flex: 1,
    flexBasis: 0,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionBtnSecondary: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  actionIcon: { fontSize: 22, marginBottom: 4 },
  actionLabel: { color: colors.white, fontWeight: 'bold', fontSize: 12 },
  actionLabelSecondary: { color: colors.primary },

  // SECTION
  section: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: colors.secondary,
    paddingLeft: 8,
  },
  emptyText: { color: colors.textSecondary, textAlign: 'center', paddingVertical: 12 },

  // MATCH CARD
  matchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  matchTeamBlock: { flex: 1 },
  matchTeamRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  matchTeamRowRight: { justifyContent: 'flex-end' },
  matchEscudoImg: { width: 36, height: 36 },
  matchEscudoPlaceholder: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  matchEscudoText: { fontSize: 12, fontWeight: 'bold', color: colors.textSecondary },
  matchTeam: { flex: 1, fontSize: 13, fontWeight: 'bold', color: colors.text, textAlign: 'left' },
  matchTeamRight: { textAlign: 'right' },
  matchScoreBlock: { alignItems: 'center', paddingHorizontal: 12 },
  matchScore: { fontSize: 22, fontWeight: 'bold', color: colors.primary },
  matchVs: { fontSize: 16, fontWeight: 'bold', color: colors.primary },
  matchFecha: { fontSize: 12, color: colors.textSecondary, marginTop: 4, textAlign: 'center' },
  matchCountdown: { fontSize: 12, color: colors.primary, fontWeight: 'bold', marginTop: 4, textAlign: 'center', letterSpacing: 0.5 },

  // NOTICIAS BANNER
  noticiasBanner: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  noticiasInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 16,
    gap: 12,
  },
  noticiasIcon: { fontSize: 28 },
  noticiasTextBlock: { flex: 1 },
  noticiasTitle: { color: colors.white, fontSize: 16, fontWeight: 'bold' },
  noticiasSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },
  noticiasArrow: { color: colors.secondary, fontSize: 28, fontWeight: 'bold' },

  // SPONSORS
  sponsorsRowLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.4, textTransform: 'uppercase', color: '#999', marginBottom: 6, marginTop: 14, paddingHorizontal: 2 },
  sponsorsRow: { gap: 10, paddingVertical: 4, paddingHorizontal: 2 },
  sponsorCard: { width: 120, height: 72, borderRadius: 8, backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center', padding: 8 },
  sponsorCardLg: { width: 150, height: 90 },
  sponsorCardSm: { width: 100, height: 60 },
  sponsorCardDark: { backgroundColor: '#1a1a2e' },
  sponsorImg:   { width: 90,  height: 40 },
  sponsorImgLg: { width: 120, height: 54 },
  sponsorImgSm: { width: 76,  height: 32 },

  // NOTICIAS DESTACADAS
  destacadasRow: { gap: 8, paddingVertical: 4 },
  destacadaCard: {
    width: 220,
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 4,
  },
  destacadaImage: {
    width: 220,
    height: 160,
    position: 'absolute',
    top: 0,
    left: 0,
  },
  destacadaOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: 'rgba(0,0,0,0.55)',
    padding: 10,
    justifyContent: 'flex-end',
  },
  destacadaBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
  },
  destacadaBadgeText: { color: colors.white, fontSize: 12, fontWeight: 'bold' },
  destacadaTitulo: {
    color: colors.white,
    fontSize: 13,
    fontWeight: 'bold',
    lineHeight: 17,
  },

  // TABLE
  table: { borderRadius: 8, overflow: 'hidden' },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tableHeader: { backgroundColor: colors.primary, borderBottomWidth: 0 },
  highlightRow: { backgroundColor: '#fde8ec' },
  cell: { width: 30, textAlign: 'center', fontSize: 13, color: colors.text },
  cellPos: { width: 26 },
  cellPts: { width: 34, fontWeight: 'bold' },
  cellEquipo: { flex: 1, fontSize: 13, fontWeight: 'bold', color: colors.white, paddingLeft: 4 },
  cellEquipoText: { flex: 1, fontSize: 13, color: colors.text },
  headerCell: { color: colors.white, fontWeight: 'bold', fontSize: 12 },
  ptsText: { color: colors.primary, fontWeight: 'bold' },
  highlightText: { fontWeight: 'bold', color: colors.primary },
  highlightPts: { color: colors.primary, fontWeight: 'bold' },
  equipoCell: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingLeft: 4, gap: 4 },
  escudoSmall: { width: 18, height: 18, resizeMode: 'contain' },
  verTodaBtn: { marginTop: 10, alignItems: 'center', paddingVertical: 8 },
  verTodaText: { color: colors.primary, fontWeight: 'bold', fontSize: 13 },
});
