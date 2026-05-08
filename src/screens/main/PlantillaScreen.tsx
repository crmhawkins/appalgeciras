import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Image, RefreshControl, SectionList,
  Animated, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import api from '../../services/api';
import { getCached, setCached, getCachedStale } from '../../services/cache';
import { TEMPORADA_CORTA, COMPETICION } from '../../constants';
import { fotoUrl, nombreCompleto, JugadorBase } from '../../utils/jugadorUtils';

interface Jugador extends JugadorBase {
  id: number;
  posicion?: string;
}

type PosicionGrupo = 'Porteros' | 'Defensas' | 'Centrocampistas' | 'Delanteros' | 'Otros';

const POSICION_ORDEN: PosicionGrupo[] = ['Porteros', 'Defensas', 'Centrocampistas', 'Delanteros', 'Otros'];

function normalizarPosicion(posicion?: string): PosicionGrupo {
  if (!posicion) return 'Otros';
  const p = posicion.trim().toLowerCase();
  // Backend single-letter codes: G, D, M, F
  if (p === 'g') return 'Porteros';
  if (p === 'd') return 'Defensas';
  if (p === 'm') return 'Centrocampistas';
  if (p === 'f') return 'Delanteros';
  // Verbose forms
  if (p.includes('portero') || p === 'gk' || p === 'goalkeeper') return 'Porteros';
  if (p.includes('defensa') || p === 'df' || p === 'defender' || p.includes('central') || p.includes('lateral')) return 'Defensas';
  if (p.includes('centrocampista') || p === 'mf' || p === 'midfielder' || p.includes('medio') || p.includes('pivote')) return 'Centrocampistas';
  if (p.includes('delantero') || p === 'fw' || p === 'forward' || p.includes('extremo') || p.includes('punta')) return 'Delanteros';
  return 'Otros';
}


function SkeletonBox({ width, height, style }: { width: number | string; height: number; style?: any }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, [anim]);
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] });
  return <Animated.View style={[{ width: width as any, height, backgroundColor: '#ddd', borderRadius: 8, opacity }, style]} />;
}

function PlaceholderAvatar({ nombre, size = 52 }: { nombre: string; size?: number }) {
  const inicial = nombre.charAt(0).toUpperCase();
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.38 }]}>{inicial}</Text>
    </View>
  );
}

function JugadorFoto({ jugador, size = 52 }: { jugador: Jugador; size?: number }) {
  const [error, setError] = useState(false);
  const url = fotoUrl(jugador);
  if (!url || error) return <PlaceholderAvatar nombre={jugador.nombre} size={size} />;
  return (
    <Image
      source={{ uri: url }}
      style={{ width: size, height: size, borderRadius: size / 2 }}
      onError={() => setError(true)}
      accessibilityLabel={jugador.apellidos ? `${jugador.nombre} ${jugador.apellidos}` : jugador.nombre}
    />
  );
}

interface Section {
  title: PosicionGrupo;
  data: Jugador[];
}

export default function PlantillaScreen() {
  const navigation = useNavigation<any>();
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [offline, setOffline] = useState(false);

  const buildSections = (flat: Jugador[]): Section[] => {
    const agrupados: Record<PosicionGrupo, Jugador[]> = {
      Porteros: [],
      Defensas: [],
      Centrocampistas: [],
      Delanteros: [],
      Otros: [],
    };
    flat.forEach((j) => { agrupados[normalizarPosicion(j.posicion)].push(j); });
    return POSICION_ORDEN
      .filter((g) => agrupados[g].length > 0)
      .map((g) => ({ title: g, data: agrupados[g] }));
  };

  const loadPlantilla = useCallback(async () => {
    const cached = await getCached<Jugador[]>('plantilla');
    if (cached) setSections(buildSections(cached));
    try {
      const { data } = await api.get<any>('/api/jugadores');
      // Backend returns { ok, plantilla: { porteros, defensas, centrocampistas, delanteros } }
      // Flatten all groups into a single array
      const plantilla = data?.plantilla ?? {};
      const flat: Jugador[] = [
        ...(plantilla.porteros ?? []),
        ...(plantilla.defensas ?? []),
        ...(plantilla.centrocampistas ?? []),
        ...(plantilla.delanteros ?? []),
      ];
      setSections(buildSections(flat));
      await setCached('plantilla', flat);
      setOffline(false);
    } catch (_) {
      const stale = await getCachedStale<Jugador[]>('plantilla');
      if (stale) { setSections(buildSections(stale)); setOffline(true); }
    }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { loadPlantilla(); }, [loadPlantilla]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadPlantilla();
  }, [loadPlantilla]);

  const goDetalle = (id: number) => navigation.navigate('JugadorDetalle', { id });

  const filteredSections = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sections;
    return sections
      .map((sec) => ({
        title: sec.title,
        data: sec.data.filter((j) => nombreCompleto(j).toLowerCase().includes(q)),
      }))
      .filter((sec) => sec.data.length > 0);
  }, [sections, search]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.headerBar}>
          <Image
            source={{ uri: 'https://backend-algeciras.hawkins.es/acf/2025/10/Diseno-sin-titulo-94.png' }}
            style={styles.headerBanner}
            resizeMode="cover"
          />
          <View style={styles.headerOverlay}>
            <Text style={styles.headerTitle}>Plantilla {TEMPORADA_CORTA}</Text>
            <Text style={styles.headerSub}>{COMPETICION.replace('·', '•')}</Text>
          </View>
        </View>
        <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <View key={i} style={styles.skeletonRow}>
              <SkeletonBox width={64} height={64} style={{ borderRadius: 32 }} />
              <View style={{ flex: 1, marginLeft: 14, gap: 8 }}>
                <SkeletonBox width={`${60 + (i % 3) * 10}%`} height={14} />
                <SkeletonBox width={`${30 + (i % 4) * 8}%`} height={11} />
              </View>
            </View>
          ))}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Image
          source={{ uri: 'https://backend-algeciras.hawkins.es/acf/2025/10/Diseno-sin-titulo-94.png' }}
          style={styles.headerBanner}
          resizeMode="cover"
        />
        <View style={styles.headerOverlay}>
          <TouchableOpacity style={styles.plantillaBackBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.plantillaBackIcon}>‹</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Plantilla {TEMPORADA_CORTA}</Text>
            <Text style={styles.headerSub}>{COMPETICION.replace('·', '•')}</Text>
          </View>
        </View>
      </View>
      {offline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineBannerText}>📡 Sin conexión — mostrando datos guardados</Text>
        </View>
      )}
      <View style={styles.searchWrap}>
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar jugador..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor={colors.textSecondary}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {search.length > 0 && (
            <TouchableOpacity style={styles.clearBtn} onPress={() => setSearch('')}>
              <Text style={styles.clearBtnText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      <SectionList
        sections={filteredSections}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
        contentContainerStyle={styles.list}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText}>{section.title.toUpperCase()}</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.jugadorCard} onPress={() => goDetalle(item.id)} activeOpacity={0.75}>
            <JugadorFoto jugador={item} size={64} />
            <View style={styles.jugadorInfo}>
              <Text style={styles.jugadorNombre} numberOfLines={1}>{nombreCompleto(item)}</Text>
              <Text style={styles.jugadorPosicion}>{item.posicion ?? '—'}</Text>
            </View>
            {item.dorsal != null && (
              <View style={styles.dorsalBadge}>
                <Text style={styles.dorsalText}>{item.dorsal}</Text>
              </View>
            )}
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          search.trim() ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🔎</Text>
              <Text style={styles.emptyTitle}>Sin resultados</Text>
              <Text style={styles.emptyText}>Prueba con otro nombre</Text>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>👥</Text>
              <Text style={styles.emptyTitle}>Plantilla no disponible</Text>
              <Text style={styles.emptyText}>Los jugadores aparecerán aquí cuando se publiquen</Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerBar: {
    backgroundColor: colors.primary,
    overflow: 'hidden',
  },
  headerBanner: { width: '100%', height: 100 },
  headerOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: 'rgba(200,16,46,0.7)', flexDirection: 'row', alignItems: 'center' },
  headerTitle: {
    color: colors.white,
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerSub: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2 },
  list: { paddingBottom: 24 },
  sectionHeader: {
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    marginTop: 12,
  },
  sectionHeaderText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.primary,
    letterSpacing: 1.2,
  },
  jugadorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    padding: 14,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  avatar: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: colors.white, fontWeight: 'bold' },
  jugadorInfo: { flex: 1 },
  jugadorNombre: { fontSize: 15, fontWeight: '600', color: colors.text },
  jugadorPosicion: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  dorsalBadge: {
    backgroundColor: colors.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dorsalText: { color: colors.white, fontWeight: 'bold', fontSize: 14 },
  chevron: { color: colors.textSecondary, fontSize: 22, marginLeft: 4 },
  emptyContainer: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 52, marginBottom: 14 },
  emptyTitle: { fontSize: 17, fontWeight: 'bold', color: colors.primary, marginBottom: 8, textAlign: 'center' },
  emptyText: { textAlign: 'center', color: colors.textSecondary, fontSize: 14, lineHeight: 20 },
  searchWrap: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.background,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
  },
  clearBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearBtnText: { fontSize: 14, color: colors.textSecondary, fontWeight: 'bold' },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  offlineBanner: {
    backgroundColor: '#fff3cd',
    borderColor: '#ffe69c',
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
  },
  offlineBannerText: { color: '#7a5c00', fontSize: 12, textAlign: 'center', fontWeight: '600' },
  plantillaBackBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  plantillaBackIcon: { color: colors.white, fontSize: 32, lineHeight: 36, fontWeight: '300' },
});
