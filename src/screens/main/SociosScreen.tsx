import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { Abono } from '../../types';
import { setCached, getCachedStale } from '../../services/cache';

const VENTAJAS = [
  {
    icon: '🏥',
    titulo: 'Quirónsalud',
    descripcion: 'Hospital oficial del Algeciras CF. Descuentos exclusivos en consultas y tratamientos para abonados.',
    logo: 'https://backend-algeciras.hawkins.es/acf/2021/11/20-quironsalud.svg',
  },
  {
    icon: '👕',
    titulo: 'Capelli Sport',
    descripcion: 'Equipación oficial del club. Los socios disfrutan de descuentos en toda la línea de ropa oficial.',
    logo: 'https://backend-algeciras.hawkins.es/acf/2021/11/Capelli-Sport_Logo_White-scaled.png',
  },
  {
    icon: '⚡',
    titulo: 'Yes Energy',
    descripcion: 'Patrocinador energético. Descuentos en servicios para socios abonados del club.',
    logo: 'https://backend-algeciras.hawkins.es/acf/2024/11/Post-instagram-Yesenergy-1.png',
  },
  {
    icon: '💻',
    titulo: 'Hawkins',
    descripcion: 'Partner tecnológico oficial. Gestión digital del club y plataforma de abonados.',
    logo: 'https://backend-algeciras.hawkins.es/acf/2021/11/DISENOS-2025-HAWKINS--e1741864702878.png',
  },
];

export default function SociosScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();

  const [abonos, setAbonos] = useState<Abono[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  const loadAbonos = useCallback(async () => {
    if (!user) {
      setLoading(false);
      setLoaded(true);
      return;
    }
    setLoading(true);
    const cacheKey = `socios_abonos_${user.id}`;
    try {
      const { data } = await api.get<Abono[]>(`/api/abonos/usuario/${user.id}`);
      const lista = Array.isArray(data) ? data : [];
      setAbonos(lista);
      setIsOffline(false);
      await setCached(cacheKey, lista);
    } catch {
      const stale = await getCachedStale<Abono[]>(cacheKey);
      if (stale) {
        setAbonos(stale);
        setIsOffline(true);
      } else {
        setAbonos([]);
        setIsOffline(false);
      }
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  }, [user]);

  useEffect(() => { loadAbonos(); }, [loadAbonos]);

  const tieneAbonoActivo = abonos.some(a => a.activo);

  // No logged in
  if (!user) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🏅 Zona Socios</Text>
        </View>
        <View style={styles.centerContainer}>
          <Text style={styles.restrictIcon}>🔒</Text>
          <Text style={styles.restrictTitle}>Área privada</Text>
          <Text style={styles.restrictText}>
            Debes iniciar sesión para ver esta sección
          </Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => navigation.navigate('Auth', { screen: 'Login' })}
          >
            <Text style={styles.primaryBtnText}>Iniciar sesión</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Loading
  if (loading || !loaded) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🏅 Zona Socios</Text>
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // No active abono
  if (!tieneAbonoActivo) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🏅 Zona Socios</Text>
        </View>
        <View style={styles.centerContainer}>
          <Text style={styles.restrictIcon}>🎟️</Text>
          <Text style={styles.restrictTitle}>Zona exclusiva para abonados</Text>
          <Text style={styles.restrictText}>
            Adquiere tu abono y accede a todas las ventajas exclusivas del club
          </Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => navigation.navigate('AbonosTab')}
          >
            <Text style={styles.primaryBtnText}>¡Hazte socio!</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Socio activo — contenido exclusivo
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🏅 Zona Socios</Text>
        <Text style={styles.headerSub}>Ventajas exclusivas para abonados</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {isOffline && (
          <View style={styles.offlineBanner}>
            <Text style={styles.offlineBannerText}>⚠️ Datos sin conexión</Text>
          </View>
        )}
        <View style={styles.heroBanner}>
          <Image
            source={{ uri: 'https://backend-algeciras.hawkins.es/acf/2022/06/abonados-home.jpg' }}
            style={styles.heroBannerImg}
            resizeMode="cover"
          />
          <View style={styles.heroBannerOverlay}>
            <Text style={styles.heroBannerTitle}>🏅 Hazte Socio</Text>
            <Text style={styles.heroBannerSub}>Estadio El Mirador · Algeciras</Text>
          </View>
        </View>

        <View style={styles.clubInfoCard}>
          <Text style={styles.clubInfoTitle}>Algeciras Club de Fútbol</Text>
          <Text style={styles.clubInfoText}>
            Fundado en 1912, el Algeciras CF juega en Primera RFEF. El estadio Municipal de El Mirador tiene capacidad para 8.500 espectadores.
            {'\n\n'}Ser socio te da acceso a todos los partidos como local, descuentos con patrocinadores y la posibilidad de votar al mejor jugador del mes.
          </Text>
        </View>

        <View style={styles.welcomeBanner}>
          <Text style={styles.welcomeText}>
            ¡Bienvenido, {(user as any).nombre || 'socio'}! 👋
          </Text>
          <Text style={styles.welcomeSub}>Disfrutas de todas las ventajas de ser abonado</Text>
        </View>

        <Text style={styles.sectionTitle}>Tus ventajas</Text>

        {VENTAJAS.map((v, i) => (
          <View key={i} style={styles.ventajaCard}>
            <View style={styles.ventajaLogoBox}>
              {v.logo ? (
                <Image source={{ uri: v.logo }} style={styles.ventajaLogo} resizeMode="contain" />
              ) : (
                <Text style={styles.ventajaIcon}>{v.icon}</Text>
              )}
            </View>
            <View style={styles.ventajaInfo}>
              <Text style={styles.ventajaTitulo}>{v.titulo}</Text>
              <Text style={styles.ventajaDesc}>{v.descripcion}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { padding: 16, paddingBottom: 18, backgroundColor: colors.primary },
  headerTitle: { color: colors.white, fontSize: 20, fontWeight: 'bold' },
  headerSub: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 3 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  centerContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32,
  },
  restrictIcon: { fontSize: 56, marginBottom: 16 },
  restrictTitle: {
    fontSize: 20, fontWeight: 'bold', color: colors.primary,
    marginBottom: 10, textAlign: 'center',
  },
  restrictText: {
    fontSize: 15, color: colors.textSecondary,
    textAlign: 'center', marginBottom: 28, lineHeight: 22,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14, paddingHorizontal: 40,
    borderRadius: 8, alignItems: 'center', width: '100%',
  },
  primaryBtnText: { color: colors.white, fontWeight: 'bold', fontSize: 16 },
  welcomeBanner: {
    backgroundColor: colors.primary,
    borderRadius: 12, padding: 16, marginBottom: 20,
  },
  welcomeText: { color: colors.white, fontSize: 17, fontWeight: 'bold' },
  welcomeSub: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 4 },
  sectionTitle: {
    fontSize: 16, fontWeight: 'bold', color: colors.text,
    marginBottom: 12,
  },
  heroBanner: { height: 160, borderRadius: 12, overflow: 'hidden', marginBottom: 16, position: 'relative' },
  heroBannerImg: { width: '100%', height: '100%' },
  heroBannerOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 14, backgroundColor: 'rgba(200,16,46,0.75)' },
  heroBannerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  heroBannerSub: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2 },
  clubInfoCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16 },
  clubInfoTitle: { fontSize: 16, fontWeight: 'bold', color: colors.primary, marginBottom: 8 },
  clubInfoText: { fontSize: 13, color: colors.text, lineHeight: 20 },
  ventajaCard: {
    backgroundColor: colors.white,
    borderRadius: 12, padding: 14, marginBottom: 12,
    flexDirection: 'row', alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 3,
  },
  ventajaLogoBox: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#fff0f2', alignItems: 'center',
    justifyContent: 'center', marginRight: 12,
  },
  ventajaIcon: { fontSize: 24 },
  ventajaLogo: { width: 30, height: 30 },
  ventajaInfo: { flex: 1 },
  ventajaTitulo: { fontSize: 15, fontWeight: 'bold', color: colors.text },
  ventajaDesc: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  offlineBanner: {
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  offlineBannerText: { color: '#856404', fontWeight: '600', fontSize: 13 },
});
