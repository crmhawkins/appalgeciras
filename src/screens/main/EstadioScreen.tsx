import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Image, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import api from '../../services/api';
import { ESTADIO, COMPETICION, TEMPORADA } from '../../constants';

interface EstadioInfo {
  nombre?: string;
  ciudad?: string;
  direccion?: string;
  capacidad?: number | string;
  fundacion?: number | string;
  inauguracion?: number | string;
  imagen?: string;
  foto?: string;
  coordenadas?: { lat: number; lng: number } | string;
  lat?: number;
  lng?: number;
  instagram?: string;
  twitter?: string;
  youtube?: string;
}

export default function EstadioScreen() {
  const navigation = useNavigation<any>();
  const [info, setInfo] = useState<EstadioInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.get('/api/estadio')
      .then(({ data }) => {
        if (cancelled) return;
        const e = data?.estadio ?? data ?? null;
        setInfo(e);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const nombre = info?.nombre ?? ESTADIO;
  const ciudad = info?.ciudad ?? 'Algeciras, Cádiz';
  const direccion = info?.direccion ?? 'Calle El Mirador, Algeciras';
  const capacidad = info?.capacidad ?? 8500;
  const fundacion = info?.inauguracion ?? info?.fundacion ?? 1967;
  const imagen = info?.imagen ?? info?.foto;

  const lat = typeof info?.coordenadas === 'object' ? info?.coordenadas?.lat : info?.lat;
  const lng = typeof info?.coordenadas === 'object' ? info?.coordenadas?.lng : info?.lng;

  // Estadio Municipal El Mirador — coords reales
  const FALLBACK_LAT = 36.1285;
  const FALLBACK_LNG = -5.4537;

  const openMaps = () => {
    const latFinal = lat ?? FALLBACK_LAT;
    const lngFinal = lng ?? FALLBACK_LNG;
    Linking.openURL(`https://maps.google.com/?q=${latFinal},${lngFinal}`);
  };

  const igUrl = info?.instagram ?? 'https://www.instagram.com/algecirascf/';
  const twUrl = info?.twitter ?? 'https://twitter.com/AlgecirasCF';
  const ytUrl = info?.youtube ?? 'https://www.youtube.com/@Algeciras_cf';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Estadio</Text>
        <View style={styles.backBtn} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Header rojo */}
          <View style={styles.heroHeader}>
            <Text style={styles.heroTitle}>🏟️ {nombre}</Text>
            <Text style={styles.heroSubtitle}>{ciudad}</Text>
          </View>

          {/* Imagen */}
          {imagen && !imgError ? (
            <Image
              source={{ uri: imagen }}
              style={styles.image}
              resizeMode="cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <View style={[styles.image, styles.imageFallback]}>
              <Text style={styles.imageFallbackText}>🏟️</Text>
            </View>
          )}

          {/* Datos */}
          <View style={styles.card}>
            <Text style={styles.infoLine}>
              📍 <Text style={styles.infoBold}>Capacidad:</Text> {Number(capacidad).toLocaleString('es-ES')} espectadores
            </Text>
            <Text style={styles.infoLine}>
              📅 <Text style={styles.infoBold}>Inaugurado:</Text> {fundacion}
            </Text>
            <Text style={styles.infoLine}>
              🏠 <Text style={styles.infoBold}>Dirección:</Text> {direccion}
            </Text>
          </View>

          {/* Cómo llegar */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>CÓMO LLEGAR</Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={openMaps}>
              <Text style={styles.primaryBtnText}>📍 Abrir en Google Maps</Text>
            </TouchableOpacity>
          </View>

          {/* Temporada */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>TEMPORADA {TEMPORADA}</Text>
            <Text style={styles.infoLine}>{COMPETICION}</Text>
            <TouchableOpacity
              style={[styles.primaryBtn, styles.btnSpacing]}
              onPress={() => navigation.navigate('Partidos')}
            >
              <Text style={styles.primaryBtnText}>⚽ Ver partidos en casa</Text>
            </TouchableOpacity>
          </View>

          {/* Redes sociales */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>REDES SOCIALES</Text>
            <View style={styles.socialRow}>
              <TouchableOpacity style={styles.socialBtn} onPress={() => Linking.openURL(igUrl)}>
                <Text style={styles.socialIcon}>📸</Text>
                <Text style={styles.socialLabel}>Instagram</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialBtn} onPress={() => Linking.openURL(twUrl)}>
                <Text style={styles.socialIcon}>🐦</Text>
                <Text style={styles.socialLabel}>Twitter</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialBtn} onPress={() => Linking.openURL(ytUrl)}>
                <Text style={styles.socialIcon}>▶️</Text>
                <Text style={styles.socialLabel}>YouTube</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { paddingBottom: 32 },

  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    backgroundColor: colors.primary,
    paddingHorizontal: 4,
  },
  backBtn: { width: 48, height: 48, justifyContent: 'center', alignItems: 'center' },
  backIcon: { color: colors.white, fontSize: 32, lineHeight: 36, fontWeight: '300' },
  headerTitle: { flex: 1, color: colors.white, fontSize: 17, fontWeight: 'bold', textAlign: 'center' },

  heroHeader: {
    backgroundColor: colors.primary,
    padding: 18,
    paddingTop: 4,
  },
  heroTitle: { color: colors.white, fontSize: 20, fontWeight: 'bold' },
  heroSubtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 4 },

  image: { width: '100%', height: 200, backgroundColor: colors.border },
  imageFallback: { alignItems: 'center', justifyContent: 'center' },
  imageFallbackText: { fontSize: 64 },

  card: {
    backgroundColor: colors.white,
    margin: 16,
    marginBottom: 0,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.secondary,
    paddingLeft: 8,
    letterSpacing: 0.5,
  },
  infoLine: { fontSize: 14, color: colors.text, marginBottom: 8, lineHeight: 20 },
  infoBold: { fontWeight: 'bold' },

  primaryBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryBtnText: { color: colors.white, fontWeight: 'bold', fontSize: 14 },
  btnSpacing: { marginTop: 8 },

  socialRow: { flexDirection: 'row', gap: 10, justifyContent: 'space-between' },
  socialBtn: {
    flex: 1,
    backgroundColor: colors.background,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  socialIcon: { fontSize: 22, marginBottom: 4 },
  socialLabel: { fontSize: 12, color: colors.text, fontWeight: '600' },
});
