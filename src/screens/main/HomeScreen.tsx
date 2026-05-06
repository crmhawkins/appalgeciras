import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Image, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { ClasificacionItem } from '../../types';

interface PartidoAPI {
  id: number;
  local: string;
  visitante: string;
  fecha: string;
  resultado_local: number | null;
  resultado_visitante: number | null;
  estado: string;
}

export default function HomeScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const [clasificacion, setClasificacion] = useState<ClasificacionItem[]>([]);
  const [loadingClasif, setLoadingClasif] = useState(true);
  const [escudoError, setEscudoError] = useState(false);
  const [partido, setPartido] = useState<PartidoAPI | null>(null);
  const [loadingPartido, setLoadingPartido] = useState(true);

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
      // Prefer most recent played match
      const jugados = data.filter(
        p => p.estado === 'jugado' || p.resultado_local !== null,
      );
      if (jugados.length > 0) {
        // Sort by fecha desc, pick first
        const sorted = jugados.sort(
          (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime(),
        );
        setPartido(sorted[0]);
      } else {
        // No played match — show next upcoming
        const proximos = data
          .filter(p => p.estado !== 'jugado' && p.resultado_local === null)
          .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
        setPartido(proximos[0] ?? null);
      }
    } catch (_) {}
    finally { setLoadingPartido(false); }
  }, []);

  useEffect(() => {
    loadClasificacion();
    loadPartido();
  }, [loadClasificacion, loadPartido]);

  const [refreshing, setRefreshing] = useState(false);
  const [verTodaClasif, setVerTodaClasif] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setLoadingClasif(true);
    setLoadingPartido(true);
    await Promise.all([loadClasificacion(), loadPartido()]);
    setRefreshing(false);
  }, [loadClasificacion, loadPartido]);

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
    (partido.estado === 'jugado' || partido.resultado_local !== null);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
      >
        {/* HEADER */}
        <View style={styles.header}>
          {escudoError ? (
            <View style={styles.escudoPlaceholder}>
              <Text style={styles.escudoText}>ACF</Text>
            </View>
          ) : (
            <Image
              source={{ uri: 'https://cdn.resfu.com/img_data/equipos/166.png' }}
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
            <View style={styles.matchCard}>
              <View style={styles.matchTeamBlock}>
                <Text style={styles.matchTeam} numberOfLines={2}>{partido.local}</Text>
              </View>
              <View style={styles.matchScoreBlock}>
                <Text style={styles.matchScore}>
                  {partido.resultado_local} - {partido.resultado_visitante}
                </Text>
                <Text style={styles.matchFecha}>{formatFecha(partido.fecha)}</Text>
              </View>
              <View style={styles.matchTeamBlock}>
                <Text style={[styles.matchTeam, styles.matchTeamRight]} numberOfLines={2}>
                  {partido.visitante}
                </Text>
              </View>
            </View>
          ) : (
            /* PRÓXIMO */
            <View style={styles.matchCard}>
              <View style={styles.matchTeamBlock}>
                <Text style={styles.matchTeam} numberOfLines={2}>{partido.local}</Text>
              </View>
              <View style={styles.matchScoreBlock}>
                <Text style={styles.matchVs}>VS</Text>
                <Text style={styles.matchFecha}>{formatFecha(partido.fecha)}</Text>
              </View>
              <View style={styles.matchTeamBlock}>
                <Text style={[styles.matchTeam, styles.matchTeamRight]} numberOfLines={2}>
                  {partido.visitante}
                </Text>
              </View>
            </View>
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

        {/* PATROCINADORES */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Patrocinadores</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.sponsorsRow}
          >
            {[0, 1, 2].map(i => (
              <View key={i} style={styles.sponsorBlock}>
                <Text style={styles.sponsorText}>Espacio{'\n'}patrocinador</Text>
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
  container: { padding: 16 },

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
  matchTeam: { fontSize: 13, fontWeight: 'bold', color: colors.text, textAlign: 'left' },
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
  sponsorsRow: { gap: 12, paddingVertical: 4 },
  sponsorBlock: {
    width: 110,
    height: 64,
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sponsorText: { color: '#888', fontSize: 11, textAlign: 'center' },

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
