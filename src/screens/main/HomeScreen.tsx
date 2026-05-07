import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Image, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { ClasificacionItem, Noticia } from '../../types';
import { ESCUDO_URL, COMPETICION, TEMPORADA, SPONSORS as DEFAULT_SPONSORS, Sponsor } from '../../constants';

const YOUTUBE_VIDEO_ID = '1B7o0uklMW8';
const youtubeHtml = `
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  * { margin: 0; padding: 0; }
  body { background: #000; overflow: hidden; }
  iframe { width: 100%; height: 100vh; border: none; }
</style>
</head>
<body>
<iframe src="https://www.youtube.com/embed/${YOUTUBE_VIDEO_ID}?autoplay=1&mute=1&controls=1&rel=0&playsinline=1&loop=1&playlist=${YOUTUBE_VIDEO_ID}" allow="autoplay; fullscreen" allowfullscreen></iframe>
</body>
</html>
`;


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
  const [patrocinadores, setPatrocinadores] = useState<Sponsor[]>(DEFAULT_SPONSORS);

  const loadClasificacion = useCallback(async () => {
    try {
      const { data } = await api.get<ClasificacionItem[]>('/api/clasificacion');
      setClasificacion(data ?? []);
    } catch (_) {}
    finally { setLoadingClasif(false); }
  }, []);

  const loadPartido = useCallback(async () => {
    try {
      const { data } = await api.get<PartidoAPI[]>('/api/partidos');
      if (!data || data.length === 0) return;
      const today = new Date().toISOString().split('T')[0];
      // Partidos con marcador = ya jugados
      const jugados = data.filter(p => p.marcador != null && p.marcador !== '');
      if (jugados.length > 0) {
        const sorted = jugados.sort(
          (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime(),
        );
        setPartido(sorted[0]);
      } else {
        // No played match — show next upcoming
        const proximos = data
          .filter(p => !p.marcador && p.fecha >= today)
          .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
        setPartido(proximos[0] ?? data[0] ?? null);
      }
    } catch (_) {}
    finally { setLoadingPartido(false); }
  }, []);

  const loadDestacadas = useCallback(async () => {
    try {
      const { data } = await api.get<{ noticias: Noticia[] }>('/api/noticias/destacadas');
      setNoticiasDestacadas((data?.noticias ?? []).slice(0, 3));
    } catch (_) {}
    finally { setLoadingDestacadas(false); }
  }, []);

  useEffect(() => {
    loadClasificacion();
    loadPartido();
    loadDestacadas();
  }, [loadClasificacion, loadPartido, loadDestacadas]);

  // Intentar cargar patrocinadores desde /api/estadio (opcional)
  useEffect(() => {
    let cancelled = false;
    api.get('/api/estadio')
      .then(({ data }) => {
        if (cancelled) return;
        const info = data?.estadio ?? data;
        const remoteSponsors = info?.patrocinadores;
        if (Array.isArray(remoteSponsors) && remoteSponsors.length > 0) {
          // Aceptar shape { name|nombre, url|imagen, dark? }
          const normalized: Sponsor[] = remoteSponsors.map((s: any) => ({
            name: s.name ?? s.nombre ?? '',
            url: s.url ?? s.imagen ?? s.logo ?? '',
            dark: !!s.dark,
          })).filter((s: Sponsor) => s.url);
          if (normalized.length > 0) setPatrocinadores(normalized);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const [refreshing, setRefreshing] = useState(false);
  const [verTodaClasif, setVerTodaClasif] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setLoadingClasif(true);
    setLoadingPartido(true);
    setLoadingDestacadas(true);
    await Promise.all([loadClasificacion(), loadPartido(), loadDestacadas()]);
    setRefreshing(false);
  }, [loadClasificacion, loadPartido, loadDestacadas]);

  const goAbonos = () => navigation.navigate('AbonosTab');
  const goPartidos = () => navigation.navigate('Partidos');
  const goNoticias = () => navigation.navigate('NoticiasTab');

  const formatFecha = (fechaStr: string) => {
    try {
      const d = new Date(fechaStr);
      return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return fechaStr;
    }
  };

  const partidoJugado =
    partido !== null &&
    (partido.marcador != null && partido.marcador !== '');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
      >
        {/* VIDEO HERO */}
        <View style={styles.videoHero}>
          <WebView
            source={{ html: youtubeHtml }}
            style={styles.videoWebView}
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            javaScriptEnabled
            scrollEnabled={false}
            bounces={false}
          />
          <View style={styles.videoOverlay}>
            <Text style={styles.videoClubTag}>⚽ ALGECIRAS C.F.</Text>
            <Text style={styles.videoSeason}>Temporada {TEMPORADA} · {COMPETICION.split(' · ')[0]}</Text>
          </View>
        </View>

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
            />
          )}
          <View>
            <Text style={styles.clubName}>Algeciras CF</Text>
            <Text style={styles.welcome}>
              {user ? `Hola, ${user.nombre || user.email}` : 'Bienvenido, aficionado'}
            </Text>
          </View>
        </View>

        {/* ACTION BUTTONS */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={goAbonos}>
            <Text style={styles.actionIcon}>🎟️</Text>
            <Text style={styles.actionLabel}>Comprar Abono</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnSecondary]} onPress={goPartidos}>
            <Text style={styles.actionIcon}>⚽</Text>
            <Text style={[styles.actionLabel, styles.actionLabelSecondary]}>Ver Partidos</Text>
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
                      <Image source={{ uri: n.imagen }} style={styles.destacadaImage} resizeMode="cover" />
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

        {/* PATROCINADORES */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Patrocinadores</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sponsorsRow}>
            {patrocinadores.map((s) => (
              <View key={s.name} style={[styles.sponsorCard, s.dark && styles.sponsorCardDark]}>
                <Image source={{ uri: s.url }} style={styles.sponsorImg} resizeMode="contain" />
                <Text style={[styles.sponsorName, s.dark && styles.sponsorNameDark]}>{s.name}</Text>
              </View>
            ))}
          </ScrollView>
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
                <Text style={[styles.cell, styles.headerCell]}>GF</Text>
                <Text style={[styles.cell, styles.headerCell]}>GC</Text>
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
                    <Text style={[styles.cell, isAlgeciras && styles.highlightText]}>{item.gf}</Text>
                    <Text style={[styles.cell, isAlgeciras && styles.highlightText]}>{item.gc}</Text>
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

  // VIDEO HERO
  videoHero: { width: '100%', height: 210, marginHorizontal: -16, marginTop: 0, marginBottom: 16, backgroundColor: '#000' },
  videoWebView: { flex: 1, backgroundColor: '#000' },
  videoOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: 'rgba(0,0,0,0.45)',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  videoClubTag: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  videoSeason: { color: 'rgba(255,255,255,0.8)', fontSize: 11 },

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
  actionsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  actionBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionBtnSecondary: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  actionIcon: { fontSize: 24, marginBottom: 4 },
  actionLabel: { color: colors.white, fontWeight: 'bold', fontSize: 13 },
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
  matchEscudoText: { fontSize: 11, fontWeight: 'bold', color: colors.textSecondary },
  matchTeam: { flex: 1, fontSize: 13, fontWeight: 'bold', color: colors.text, textAlign: 'left' },
  matchTeamRight: { textAlign: 'right' },
  matchScoreBlock: { alignItems: 'center', paddingHorizontal: 12 },
  matchScore: { fontSize: 22, fontWeight: 'bold', color: colors.primary },
  matchVs: { fontSize: 16, fontWeight: 'bold', color: colors.primary },
  matchFecha: { fontSize: 11, color: colors.textSecondary, marginTop: 4, textAlign: 'center' },

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
  sponsorsRow: { gap: 10, paddingVertical: 4, paddingHorizontal: 2 },
  sponsorCard: { width: 120, height: 80, borderRadius: 10, backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center', padding: 8, gap: 4 },
  sponsorCardDark: { backgroundColor: '#1a1a2e' },
  sponsorImg: { width: 90, height: 42 },
  sponsorName: { fontSize: 9, color: '#666', fontWeight: '600' },
  sponsorNameDark: { color: 'rgba(255,255,255,0.6)' },

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
  destacadaBadgeText: { color: colors.white, fontSize: 10, fontWeight: 'bold' },
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
  highlightRow: { backgroundColor: '#e8f5ee' },
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
