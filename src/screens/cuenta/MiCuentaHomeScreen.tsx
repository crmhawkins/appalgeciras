import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme/colors';
import CarnetSocio from '../../components/CarnetSocio';
import SeccionAtajo from '../../components/SeccionAtajo';
import { Abono, Entrada, Compra, Usuario } from '../../types';

interface MeResponse {
  usuario?: Usuario;
  user?: Usuario;
  matchdayToday?: boolean;
}

export default function MiCuentaHomeScreen() {
  const { user, updateUser, logout } = useAuth();
  const navigation = useNavigation<any>();

  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({ abonos: 0, entradas: 0, compras: 0, beneficios: 0 });
  const [attendanceRate, setAttendanceRate] = useState<number | null>(null);
  const [matchdayToday, setMatchdayToday] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [meRes, abonosRes, entradasRes, ordersRes] = await Promise.allSettled([
        api.get<MeResponse>('/api/me'),
        api.get<any>(`/api/abonos/usuario/${user.id}`),
        api.get<any>(`/api/entradas/usuario/${user.id}`),
        api.get<any>('/api/me/orders'),
      ]);

      if (meRes.status === 'fulfilled') {
        const d = meRes.value.data;
        const u = d?.usuario || d?.user;
        if (u) {
          await updateUser(u as Partial<Usuario>);
          if (u.customer?.attendanceRate != null) setAttendanceRate(Number(u.customer.attendanceRate));
        }
        if (d?.matchdayToday) setMatchdayToday(true);
      }

      let abonosCount = 0;
      let entradasCount = 0;
      let comprasCount = 0;

      if (abonosRes.status === 'fulfilled') {
        const d = abonosRes.value.data;
        const lista: Abono[] = Array.isArray(d) ? d : (d?.abonos ?? []);
        abonosCount = lista.filter((a) => a?.activo !== false).length;
      }
      if (entradasRes.status === 'fulfilled') {
        const d = entradasRes.value.data;
        const lista: Entrada[] = Array.isArray(d) ? d : (d?.entradas ?? []);
        entradasCount = lista.filter((e) => e?.estado === 'valida' || e?.estado === 'pendiente').length;
      }
      if (ordersRes.status === 'fulfilled') {
        const d = ordersRes.value.data;
        const lista: Compra[] = Array.isArray(d) ? d : (d?.orders ?? d?.compras ?? []);
        comprasCount = lista.length;
      }

      setCounts({ abonos: abonosCount, entradas: entradasCount, compras: comprasCount, beneficios: 0 });
    } finally {
      setLoading(false);
    }
  }, [user?.id, updateUser]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  }, [fetchAll]);

  const confirmLogout = () => {
    Alert.alert('Cerrar sesión', '¿Seguro que quieres salir?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: () => logout() },
    ]);
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}><Text style={styles.headerTitle}>Mi Cuenta</Text></View>
        <View style={styles.guest}>
          <Text style={styles.guestTitle}>Inicia sesión</Text>
          <Text style={styles.guestText}>Accede para ver tu carnet, abonos y compras.</Text>
          <TouchableOpacity
            style={styles.loginBtn}
            onPress={() => navigation.navigate('Auth', { screen: 'Login' })}
          >
            <Text style={styles.loginBtnText}>Iniciar sesión</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}><Text style={styles.headerTitle}>Mi Cuenta</Text></View>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Carnet grande */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => navigation.navigate('Carnet')}
          style={styles.carnetWrap}
        >
          <CarnetSocio usuario={user} size="compact" />
        </TouchableOpacity>

        {/* Matchday banner */}
        {matchdayToday && (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Carnet')}
            style={styles.matchdayBanner}
          >
            <Text style={styles.matchdayIcon}>⚽</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.matchdayTitle}>¡HOY HAY PARTIDO!</Text>
              <Text style={styles.matchdaySub}>Pulsa para ver tu QR de acceso</Text>
            </View>
            <Text style={styles.matchdayArrow}>›</Text>
          </TouchableOpacity>
        )}

        {/* Grid atajos */}
        <View style={styles.grid}>
          <View style={styles.gridRow}>
            <SeccionAtajo
              icon="🎫" label="Mis Abonos" count={counts.abonos}
              onPress={() => navigation.navigate('MisAbonosCuenta')}
              style={styles.gridCell}
            />
            <View style={styles.gridGap} />
            <SeccionAtajo
              icon="🏟️" label="Mis Entradas" count={counts.entradas}
              onPress={() => navigation.navigate('MisEntradasCuenta')}
              style={styles.gridCell}
            />
          </View>
          <View style={styles.gridRow}>
            <SeccionAtajo
              icon="📦" label="Mis Compras" count={counts.compras}
              onPress={() => navigation.navigate('MisCompras')}
              style={styles.gridCell}
            />
            <View style={styles.gridGap} />
            <SeccionAtajo
              icon="🎁" label="Beneficios" count={counts.beneficios}
              onPress={() => navigation.navigate('Beneficios')}
              style={styles.gridCell}
            />
          </View>
          <View style={styles.gridRow}>
            <SeccionAtajo
              icon="⭐" label="Mi Actividad"
              onPress={() => navigation.navigate('Actividad')}
              style={styles.gridCell}
            />
            <View style={styles.gridGap} />
            <SeccionAtajo
              icon="⚙️" label="Mis Datos"
              onPress={() => navigation.navigate('Perfil')}
              style={styles.gridCell}
            />
          </View>
          <View style={styles.gridRow}>
            <SeccionAtajo
              icon="🔔" label="Notificaciones"
              onPress={() => navigation.navigate('Notificaciones')}
              style={styles.gridCell}
            />
            <View style={styles.gridGap} />
            <View style={[styles.gridCell, { opacity: 0 }]} />
          </View>
        </View>

        {/* Tu temporada */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Tu temporada</Text>
          {loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 12 }} />
          ) : (
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>
                  {attendanceRate != null ? `${Math.round(attendanceRate)}%` : '—'}
                </Text>
                <Text style={styles.statLabel}>Asistencia</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>—</Text>
                <Text style={styles.statLabel}>Votos MVP</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>—</Text>
                <Text style={styles.statLabel}>Dorsal favorito</Text>
              </View>
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={confirmLogout}>
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { padding: 16, backgroundColor: colors.primary },
  headerTitle: { color: colors.white, fontSize: 20, fontWeight: '800' },
  scroll: { padding: 16, paddingBottom: 40 },
  carnetWrap: { marginBottom: 12, alignItems: 'center' },
  matchdayBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 12,
    elevation: 4,
    shadowColor: colors.primary,
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
  },
  matchdayIcon: { fontSize: 28, marginRight: 12 },
  matchdayTitle: { color: colors.white, fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
  matchdaySub: { color: 'rgba(255,255,255,0.9)', fontSize: 12, marginTop: 2 },
  matchdayArrow: { color: colors.white, fontSize: 28, fontWeight: '800', marginLeft: 8 },
  grid: { marginTop: 4 },
  gridRow: { flexDirection: 'row', marginBottom: 10 },
  gridCell: { flex: 1 },
  gridGap: { width: 10 },
  card: {
    backgroundColor: colors.white,
    marginTop: 6,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  cardTitle: { fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: 12 },
  statsRow: { flexDirection: 'row', gap: 8 },
  statBox: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: { fontSize: 20, fontWeight: '800', color: colors.primary },
  statLabel: { fontSize: 11, color: colors.textSecondary, textAlign: 'center', marginTop: 4 },
  logoutBtn: {
    backgroundColor: colors.error,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  logoutText: { color: colors.white, fontWeight: '800', fontSize: 16 },
  guest: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  guestTitle: { fontSize: 22, fontWeight: '800', color: colors.primary, marginBottom: 8 },
  guestText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: 24 },
  loginBtn: { backgroundColor: colors.primary, paddingVertical: 14, paddingHorizontal: 40, borderRadius: 8 },
  loginBtnText: { color: colors.white, fontWeight: '800', fontSize: 16 },
});
