import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import WebView from 'react-native-webview';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../../theme/colors';
import api from '../../services/api';
import { Noticia } from '../../types';
import { MainStackParamList } from '../../navigation/MainStack';

type Nav = NativeStackNavigationProp<MainStackParamList>;

type MainTab = 'noticias' | 'tv';

type CategoriaFilter = 'todo' | 'fichaje' | 'partido' | 'comunicado' | 'galeria' | 'otro';

interface NoticiasResponse {
  total: number;
  pagina: number;
  totalPaginas: number;
  noticias: Noticia[];
}

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
  fichaje: 'Fichajes',
  partido: 'Partidos',
  comunicado: 'Comunicados',
  lesion: 'Lesiones',
  galeria: 'Galería',
  evento: 'Eventos',
  otro: 'Otros',
};

const FILTER_PILLS: { key: CategoriaFilter; label: string }[] = [
  { key: 'todo', label: 'Todo' },
  { key: 'fichaje', label: 'Fichajes' },
  { key: 'partido', label: 'Partidos' },
  { key: 'comunicado', label: 'Comunicados' },
  { key: 'galeria', label: 'Galería' },
  { key: 'otro', label: 'Otros' },
];

function formatFecha(fechaStr: string): string {
  try {
    const d = new Date(fechaStr);
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return fechaStr;
  }
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

function NoticiaCardSkeleton() {
  return (
    <View style={styles.card}>
      <SkeletonBox width={'100%'} height={180} style={{ borderRadius: 0 }} />
      <View style={styles.cardBody}>
        <SkeletonBox width={'70%'} height={14} style={{ marginBottom: 8 }} />
        <SkeletonBox width={'40%'} height={11} />
      </View>
    </View>
  );
}

function NoticiaCard({ noticia, onPress }: { noticia: Noticia; onPress: () => void }) {
  const [imgError, setImgError] = useState(false);
  const catColor = CATEGORIA_COLORS[noticia.categoria] ?? '#607D8B';
  const catLabel = CATEGORIA_LABELS[noticia.categoria] ?? noticia.categoria;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.82}>
      {noticia.imagen && !imgError ? (
        <Image
          source={{ uri: noticia.imagen }}
          style={styles.cardImage}
          resizeMode="cover"
          onError={() => setImgError(true)}
          accessibilityLabel={noticia.titulo}
        />
      ) : (
        <View style={[styles.cardImageFallback, { backgroundColor: catColor + '33' }]}>
          <Text style={[styles.cardImageFallbackText, { color: catColor }]}>{catLabel}</Text>
        </View>
      )}
      <View style={styles.cardBody}>
        <View style={styles.cardMeta}>
          <View style={[styles.badge, { backgroundColor: catColor }]}>
            <Text style={styles.badgeText}>{catLabel}</Text>
          </View>
          <Text style={styles.cardFecha}>{formatFecha(noticia.fecha)}</Text>
        </View>
        <Text style={styles.cardTitle} numberOfLines={2}>{noticia.titulo}</Text>
        {noticia.extracto ? (
          <Text style={styles.cardExtracto} numberOfLines={2}>{noticia.extracto}</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

function NoticiasListTab() {
  const navigation = useNavigation<Nav>();
  const [categoria, setCategoria] = useState<CategoriaFilter>('todo');
  const [noticias, setNoticias] = useState<Noticia[]>([]);
  const [page, setPage] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNoticias = useCallback(async (pg: number, cat: CategoriaFilter, append = false) => {
    try {
      const params: Record<string, string | number> = { page: pg, limit: 10 };
      if (cat !== 'todo') params.categoria = cat;
      const { data } = await api.get<NoticiasResponse>('/api/noticias', { params });
      const list = data?.noticias ?? [];
      setTotalPaginas(data?.totalPaginas ?? 1);
      if (append) {
        setNoticias(prev => [...prev, ...list]);
      } else {
        setNoticias(list);
      }
    } catch (_) {}
  }, []);

  const load = useCallback(async (cat: CategoriaFilter) => {
    setLoading(true);
    setPage(1);
    await fetchNoticias(1, cat, false);
    setLoading(false);
  }, [fetchNoticias]);

  useEffect(() => {
    load(categoria);
  }, [load]); // eslint-disable-line react-hooks/exhaustive-deps

  const onChangeCategoria = (cat: CategoriaFilter) => {
    setCategoria(cat);
    load(cat);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setPage(1);
    await fetchNoticias(1, categoria, false);
    setRefreshing(false);
  }, [categoria, fetchNoticias]);

  const loadMore = useCallback(async () => {
    if (loadingMore || page >= totalPaginas) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    await fetchNoticias(nextPage, categoria, true);
    setPage(nextPage);
    setLoadingMore(false);
  }, [loadingMore, page, totalPaginas, categoria, fetchNoticias]);

  return (
    <View style={{ flex: 1 }}>
      {/* Category filter pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.pillsScroll}
        contentContainerStyle={styles.pillsContainer}
      >
        {FILTER_PILLS.map(pill => (
          <TouchableOpacity
            key={pill.key}
            style={[styles.pill, categoria === pill.key && styles.pillActive]}
            onPress={() => onChangeCategoria(pill.key)}
          >
            <Text style={[styles.pillText, categoria === pill.key && styles.pillTextActive]}>
              {pill.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <ScrollView contentContainerStyle={styles.listContent}>
          {Array.from({ length: 4 }).map((_, i) => (
            <NoticiaCardSkeleton key={i} />
          ))}
        </ScrollView>
      ) : (
        <FlatList
          data={noticias}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => (
            <NoticiaCard
              noticia={item}
              onPress={() => navigation.navigate('NoticiaDetalle', { slug: item.slug })}
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>No hay noticias disponibles</Text>
          }
          ListFooterComponent={
            page < totalPaginas ? (
              <TouchableOpacity style={styles.loadMoreBtn} onPress={loadMore} disabled={loadingMore}>
                {loadingMore ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <Text style={styles.loadMoreText}>Cargar más</Text>
                )}
              </TouchableOpacity>
            ) : null
          }
        />
      )}
    </View>
  );
}

export default function NoticiasScreen() {
  const [tab, setTab] = useState<MainTab>('noticias');
  const [tvLoading, setTvLoading] = useState(true);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Tab bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'noticias' && styles.tabBtnActive]}
          onPress={() => setTab('noticias')}
        >
          <Text style={[styles.tabText, tab === 'noticias' && styles.tabTextActive]}>
            📰 Noticias
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'tv' && styles.tabBtnActive]}
          onPress={() => setTab('tv')}
        >
          <Text style={[styles.tabText, tab === 'tv' && styles.tabTextActive]}>
            📺 Algeciras TV
          </Text>
        </TouchableOpacity>
      </View>

      {tab === 'noticias' ? (
        <NoticiasListTab />
      ) : (
        <View style={{ flex: 1 }}>
          <WebView
            source={{ uri: 'https://algecirasclubdefutbol.com/algeciras-tv-2/' }}
            onLoadEnd={() => setTvLoading(false)}
            style={{ flex: 1 }}
          />
          {tvLoading && (
            <View style={styles.loaderOverlay}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  tabBtnActive: { backgroundColor: colors.secondary },
  tabText: { color: 'rgba(255,255,255,0.8)', fontWeight: '600', fontSize: 14 },
  tabTextActive: { color: colors.primary, fontWeight: 'bold' },

  // Pills
  pillsScroll: { backgroundColor: colors.white, maxHeight: 52 },
  pillsContainer: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    flexDirection: 'row',
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pillText: { fontSize: 13, color: colors.text, fontWeight: '500' },
  pillTextActive: { color: colors.white, fontWeight: 'bold' },

  // List
  listContent: { padding: 12, gap: 12 },
  loaderCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { textAlign: 'center', color: colors.textSecondary, marginTop: 40 },

  // Card
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 4,
  },
  cardImage: { width: '100%', height: 180 },
  cardImageFallback: {
    width: '100%',
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardImageFallbackText: { fontSize: 15, fontWeight: 'bold' },
  cardBody: { padding: 12 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeText: { color: colors.white, fontSize: 11, fontWeight: 'bold' },
  cardFecha: { fontSize: 12, color: colors.textSecondary },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: colors.text, marginBottom: 4 },
  cardExtracto: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },

  // Load more
  loadMoreBtn: {
    backgroundColor: colors.primary,
    marginHorizontal: 40,
    marginVertical: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  loadMoreText: { color: colors.white, fontWeight: 'bold', fontSize: 14 },

  // TV loader overlay
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
