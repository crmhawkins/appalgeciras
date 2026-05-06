import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { Abono } from '../../types';

const VENTAJAS = [
  {
    icon: '🦷',
    titulo: 'Clínica Dental',
    descripcion: 'Descuento exclusivo para socios en todos los tratamientos',
  },
  {
    icon: '🏨',
    titulo: 'Hotel Partner',
    descripcion: 'Desayuno incluido en tu estancia con tarifa socio',
  },
  {
    icon: '💆',
    titulo: 'Centro Masajes',
    descripcion: 'Primera sesión con descuento especial para abonados',
  },
  {
    icon: '⚽',
    titulo: 'Ventaja del Club',
    descripcion: 'Próximamente...',
  },
];

export default function SociosScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();

  const [abonos, setAbonos] = useState<Abono[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const loadAbonos = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await api.get<Abono[]>(`/api/abonos/usuario/${user.id}`);
      setAbonos(Array.isArray(data) ? data : []);
    } catch {
      setAbonos([]);
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
        <View style={styles.welcomeBanner}>
          <Text style={styles.welcomeText}>
            ¡Bienvenido, {(user as any).nombre || 'socio'}! 👋
          </Text>
          <Text style={styles.welcomeSub}>Disfrutas de todas las ventajas de ser abonado</Text>
        </View>

        <Text style={styles.sectionTitle}>Tus ventajas</Text>

        {VENTAJAS.map((v, i) => (
          <View key={i} style={styles.ventajaCard}>
            <View style={styles.ventajaIconWrap}>
              <Text style={styles.ventajaIcon}>{v.icon}</Text>
            </View>
            <View style={styles.ventajaContent}>
              <Text style={styles.ventajaTitulo}>{v.titulo}</Text>
              <Text style={styles.ventajaDesc}>{v.descripcion}</Text>
            </View>
            <TouchableOpacity style={styles.verOfertaBtn} disabled>
              <Text style={styles.verOfertaText}>Próximamente</Text>
            </TouchableOpacity>
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
  ventajaIconWrap: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#fff0f2', alignItems: 'center',
    justifyContent: 'center', marginRight: 12,
  },
  ventajaIcon: { fontSize: 24 },
  ventajaContent: { flex: 1 },
  ventajaTitulo: { fontSize: 15, fontWeight: 'bold', color: colors.text },
  ventajaDesc: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  verOfertaBtn: {
    backgroundColor: colors.border,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 6, marginLeft: 8,
  },
  verOfertaText: { fontSize: 11, color: colors.textSecondary, fontWeight: '600' },
});
