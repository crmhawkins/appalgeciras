import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Share,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import RenderHtml from 'react-native-render-html';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../../theme/colors';
import api from '../../services/api';
import { Noticia } from '../../types';
import { MainStackParamList } from '../../navigation/MainStack';

type Nav = NativeStackNavigationProp<MainStackParamList>;
type RouteT = RouteProp<MainStackParamList, 'NoticiaDetalle'>;

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

function formatFecha(fechaStr: string): string {
  try {
    const d = new Date(fechaStr);
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return fechaStr;
  }
}

export default function NoticiaDetalleScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteT>();
  const { slug } = route.params;
  const { width } = useWindowDimensions();

  const [noticia, setNoticia] = useState<Noticia | null>(null);
  const [relacionadas, setRelacionadas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [imgError, setImgError] = useState(false);

  const fetchNoticia = useCallback(async () => {
    try {
      setNotFound(false);
      const { data } = await api.get<{ noticia: Noticia; relacionadas?: any[] }>(`/api/noticias/${slug}`);
      if (data?.noticia) {
        setNoticia(data.noticia);
        setRelacionadas(data.relacionadas ?? []);
      } else {
        setNotFound(true);
      }
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setNotFound(true);
      }
    }
  }, [slug]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchNoticia();
      setLoading(false);
    })();
  }, [fetchNoticia]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNoticia();
    setRefreshing(false);
  }, [fetchNoticia]);

  const onShare = useCallback(async () => {
    try {
      await Share.share({
        message: noticia?.titulo ?? 'Algeciras CF',
        url: 'https://algecirasclubdefutbol.com/blog/',
      });
    } catch (_) {}
  }, [noticia]);

  const catColor = noticia ? (CATEGORIA_COLORS[noticia.categoria] ?? '#607D8B') : colors.primary;
  const catLabel = noticia ? (CATEGORIA_LABELS[noticia.categoria] ?? noticia.categoria) : '';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header bar */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Noticias</Text>
        {noticia ? (
          <TouchableOpacity style={styles.shareBtn} onPress={onShare}>
            <Text style={styles.shareIcon}>⎙</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.shareBtn} />
        )}
      </View>

      {loading ? (
        <View style={styles.loaderCenter}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : notFound || !noticia ? (
        <View style={styles.notFoundContainer}>
          <Text style={styles.notFoundIcon}>📭</Text>
          <Text style={styles.notFoundTitle}>Noticia no encontrada</Text>
          <Text style={styles.notFoundSub}>Esta noticia no está disponible o ha sido eliminada.</Text>
          <TouchableOpacity style={styles.notFoundBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.notFoundBtnText}>Volver a Noticias</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
          }
        >
          {/* Hero image */}
          {noticia.imagen && !imgError ? (
            <Image
              source={{ uri: noticia.imagen }}
              style={styles.heroImage}
              resizeMode="cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <View style={[styles.heroImageFallback, { backgroundColor: catColor + '33' }]}>
              <Text style={[styles.heroFallbackText, { color: catColor }]}>{catLabel}</Text>
            </View>
          )}

          {/* Content */}
          <View style={styles.content}>
            {/* Badge + fecha */}
            <View style={styles.metaRow}>
              <View style={[styles.badge, { backgroundColor: catColor }]}>
                <Text style={styles.badgeText}>{catLabel}</Text>
              </View>
              <Text style={styles.fecha}>{formatFecha(noticia.fecha)}</Text>
            </View>

            {/* Title */}
            <Text style={styles.titulo}>{noticia.titulo}</Text>

            {/* Excerpt */}
            {noticia.extracto ? (
              <Text style={styles.extracto}>{noticia.extracto}</Text>
            ) : null}

            {/* Separator */}
            {noticia.contenido ? <View style={styles.separator} /> : null}

            {/* Body content */}
            {noticia.contenido ? (
              <RenderHtml
                contentWidth={width - 32}
                source={{ html: noticia.contenido || '' }}
                tagsStyles={{
                  p: { fontSize: 15, lineHeight: 24, color: '#333', marginBottom: 12 },
                  strong: { fontWeight: 'bold' },
                  em: { fontStyle: 'italic' },
                  h2: { fontSize: 18, fontWeight: 'bold', marginTop: 16, marginBottom: 8 },
                  h3: { fontSize: 16, fontWeight: 'bold', marginTop: 12, marginBottom: 6 },
                  a: { color: '#C8102E' },
                  img: { marginVertical: 8, borderRadius: 8 },
                }}
              />
            ) : null}
          </View>

          {relacionadas.length > 0 && (
            <View style={styles.relacionadasSection}>
              <Text style={styles.relacionadasTitle}>📰 Más noticias</Text>
              {relacionadas.map(n => (
                <TouchableOpacity
                  key={n.id}
                  style={styles.relacionadaCard}
                  onPress={() => navigation.replace('NoticiaDetalle', { slug: n.slug })}
                >
                  {n.imagen && (
                    <Image source={{ uri: n.imagen }} style={styles.relacionadaImg} />
                  )}
                  <View style={styles.relacionadaBody}>
                    <Text style={styles.relacionadaCategoria}>{n.categoria?.toUpperCase()}</Text>
                    <Text style={styles.relacionadaTitulo} numberOfLines={2}>{n.titulo}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={styles.masNoticias}>
            <Text style={styles.masNoticiasTitle}>📰 Más noticias</Text>
            <TouchableOpacity
              style={styles.masNoticiasBtn}
              onPress={() => (navigation as any).navigate('Main', { screen: 'Tabs', params: { screen: 'NoticiasTab' } })}
            >
              <Text style={styles.masNoticiasBtnText}>Ver todas las noticias →</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    paddingHorizontal: 4,
  },
  backBtn: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: { color: colors.white, fontSize: 32, lineHeight: 36, fontWeight: '300' },
  headerTitle: {
    flex: 1,
    color: colors.white,
    fontSize: 17,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  shareBtn: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareIcon: { color: colors.white, fontSize: 22 },

  // Loading
  loaderCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Not found
  notFoundContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  notFoundIcon: { fontSize: 48, marginBottom: 16 },
  notFoundTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text, marginBottom: 8 },
  notFoundSub: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: 24 },
  notFoundBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  notFoundBtnText: { color: colors.white, fontWeight: 'bold', fontSize: 15 },

  // Content
  scrollContent: { paddingBottom: 32 },
  heroImage: { width: '100%', height: 220 },
  heroImageFallback: {
    width: '100%',
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroFallbackText: { fontSize: 18, fontWeight: 'bold' },

  content: { padding: 16 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: { color: colors.white, fontSize: 12, fontWeight: 'bold' },
  fecha: { fontSize: 13, color: colors.textSecondary },

  titulo: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
    lineHeight: 30,
  },
  extracto: {
    fontSize: 15,
    color: colors.textSecondary,
    fontStyle: 'italic',
    lineHeight: 22,
    marginBottom: 8,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 16,
  },
  contenido: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 24,
  },
  relacionadasSection: { marginHorizontal: 16, marginTop: 8, marginBottom: 8 },
  relacionadasTitle: { fontSize: 16, fontWeight: 'bold', color: colors.text, marginBottom: 12 },
  relacionadaCard: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 8,
    marginBottom: 10,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    alignItems: 'center',
  },
  relacionadaImg: { width: 60, height: 60, borderRadius: 6, marginRight: 12, backgroundColor: colors.border },
  relacionadaBody: { flex: 1 },
  relacionadaCategoria: { fontSize: 10, fontWeight: 'bold', color: colors.primary, marginBottom: 4, letterSpacing: 0.5 },
  relacionadaTitulo: { fontSize: 13, fontWeight: '600', color: colors.text, lineHeight: 18 },
  masNoticias: { margin: 16, padding: 16, backgroundColor: colors.white, borderRadius: 12, alignItems: 'center', borderLeftWidth: 3, borderLeftColor: colors.primary },
  masNoticiasTitle: { fontSize: 15, fontWeight: 'bold', color: colors.primary, marginBottom: 10 },
  masNoticiasBtn: { backgroundColor: colors.primary, paddingVertical: 10, paddingHorizontal: 24, borderRadius: 8 },
  masNoticiasBtnText: { color: colors.white, fontWeight: 'bold', fontSize: 13 },
});
