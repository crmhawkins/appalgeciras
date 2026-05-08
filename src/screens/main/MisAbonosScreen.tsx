import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  RefreshControl, TouchableOpacity, Alert, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import QRCode from 'react-native-qrcode-svg';
import { useKeepAwake } from 'expo-keep-awake';
import api from '../../services/api';
import { clearCached } from '../../services/cache';
import { colors } from '../../theme/colors';
import { Abono } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { TEMPORADA_CORTA, COMPETICION } from '../../constants';

interface QRModalData {
  value: string;
  titulo: string;
  subtitulo: string;
}

function QRFullscreenModal({ data, onClose }: { data: QRModalData | null; onClose: () => void }) {
  useKeepAwake();
  if (!data) return null;
  return (
    <Modal visible={!!data} transparent animationType="fade" onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <View style={modalStyles.container}>
          <Text style={modalStyles.titulo}>{data.titulo}</Text>
          <Text style={modalStyles.subtitulo}>{data.subtitulo}</Text>
          <View style={modalStyles.qrBox}>
            <QRCode value={data.value} size={280} />
          </View>
          <Text style={modalStyles.hint}>Mantén la pantalla en el acceso</Text>
          <TouchableOpacity style={modalStyles.closeBtn} onPress={onClose}>
            <Text style={modalStyles.closeBtnText}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
  container: { backgroundColor: '#fff', borderRadius: 16, padding: 28, alignItems: 'center', width: '90%' },
  titulo: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 4, textAlign: 'center' },
  subtitulo: { fontSize: 13, color: colors.textSecondary, marginBottom: 20, textAlign: 'center' },
  qrBox: { padding: 12, backgroundColor: '#fff', borderRadius: 8, marginBottom: 16 },
  hint: { fontSize: 12, color: colors.textSecondary, marginBottom: 20, textAlign: 'center' },
  closeBtn: { backgroundColor: colors.primary, paddingVertical: 12, paddingHorizontal: 40, borderRadius: 8 },
  closeBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});

export default function MisAbonosScreen() {
  const { user, token } = useAuth();
  const navigation = useNavigation<any>();
  const [abonos, setAbonos] = useState<Abono[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrModal, setQrModal] = useState<QRModalData | null>(null);

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setError(null);
    try {
      const { data } = await api.get<Abono[]>(`/api/abonos/usuario/${user.id}`);
      setAbonos(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.response?.data?.msg || e?.message || 'Error cargando abonos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const confirmarLiberar = (abonoId: number) => {
    Alert.alert(
      'Liberar asiento',
      '¿Seguro? Perderás tu asiento asignado para esta temporada.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Liberar',
          style: 'destructive',
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            try {
              await api.post('/api/abonos/liberar', { abonoId });
              await clearCached('socios_abonos_' + user?.id);
              load();
            } catch (e: any) {
              Alert.alert('Error', e?.response?.data?.msg || 'No se pudo liberar el asiento');
            }
          },
        },
      ]
    );
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Mis Abonos</Text>
        </View>
        <View style={styles.guestContainer}>
          <Text style={styles.guestIcon}>🎟️</Text>
          <Text style={styles.guestTitle}>Inicia sesión</Text>
          <Text style={styles.guestText}>
            Accede a tu cuenta para gestionar tus abonos de la temporada {TEMPORADA_CORTA}
          </Text>
          <TouchableOpacity
            style={styles.loginBtn}
            onPress={() => navigation.navigate('Auth', { screen: 'Login' })}
          >
            <Text style={styles.loginBtnText}>Iniciar sesión</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.registerBtn}
            onPress={() => navigation.navigate('Auth', { screen: 'Register' })}
          >
            <Text style={styles.registerBtnText}>Crear cuenta</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Mis Abonos</Text>
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>🎟️ Mis Abonos</Text>
          <Text style={styles.headerSub}>Temporada {TEMPORADA_CORTA} · {COMPETICION.split(' · ')[0]}</Text>
        </View>
      </View>
      <QRFullscreenModal data={qrModal} onClose={() => setQrModal(null)} />
      {error && <Text style={styles.error}>{error}</Text>}
      <FlatList
        data={abonos}
        keyExtractor={(a) => String(a.id)}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
          />
        }
        ListEmptyComponent={
          !error ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🎟️</Text>
              <Text style={styles.emptyTitle}>Sin abonos</Text>
              <Text style={styles.emptyText}>Aún no tienes abonos para esta temporada</Text>
              <TouchableOpacity
                style={styles.buyBtn}
                onPress={() => navigation.navigate('Tabs', { screen: 'AbonosTab' })}
              >
                <Text style={styles.buyBtnText}>Comprar un abono</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 16, textAlign: 'center', paddingHorizontal: 32 }}>
                Con tu abono accedes a todos los partidos en casa del Estadio Municipal El Mirador
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={[styles.card, !item.activo && styles.cardInactive]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardName}>{item.nombre} {item.apellidos}</Text>
              <View style={[styles.badge, item.activo ? styles.badgeActive : styles.badgeInactive]}>
                <Text style={styles.badgeText}>{item.activo ? 'Activo' : 'Inactivo'}</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <Row label="Email" value={item.email} />
            <Row label="Precio" value={`${item.precio} €`} highlight />
            <Row label="Desde" value={formatDate(item.fechaInicio)} />
            <Row label="Hasta" value={formatDate(item.fechaFin)} />
            {item.codigoAcceso && (
              <TouchableOpacity
                style={styles.codigoBox}
                onPress={() => setQrModal({
                  value: item.codigoAcceso!,
                  titulo: `${item.nombre} ${item.apellidos}`,
                  subtitulo: `Temporada ${TEMPORADA_CORTA}`,
                })}
                activeOpacity={0.75}
              >
                <Text style={styles.codigoLabel}>Código de acceso · Toca para ampliar</Text>
                <View style={styles.qrPreviewBox}>
                  <QRCode value={item.codigoAcceso} size={80} />
                </View>
                <Text style={styles.codigoCodigo}>{item.codigoAcceso}</Text>
              </TouchableOpacity>
            )}
            {item.activo && (
              <View style={styles.liberarRow}>
                <TouchableOpacity
                  style={styles.liberarBtn}
                  onPress={() => confirmarLiberar(item.id)}
                >
                  <Text style={styles.liberarText}>Liberar asiento</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      />
    </SafeAreaView>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, highlight && styles.rowValueHighlight]}>{value}</Text>
    </View>
  );
}

function formatDate(d: string): string {
  if (!d) return '—';
  try {
    const [y, m, day] = d.split('T')[0].split('-');
    return `${day}/${m}/${y}`;
  } catch { return d; }
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 8, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center' },
  headerTitle: { color: colors.white, fontSize: 20, fontWeight: 'bold' },
  headerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 2 },
  list: { padding: 14 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  cardInactive: { borderLeftColor: colors.textSecondary, opacity: 0.7 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardName: { fontSize: 16, fontWeight: 'bold', color: colors.text, flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  badgeActive: { backgroundColor: '#e8f5e9' },
  badgeInactive: { backgroundColor: '#f5f5f5' },
  badgeText: { fontSize: 12, fontWeight: '600', color: colors.text },
  divider: { height: 1, backgroundColor: colors.border, marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  rowLabel: { fontSize: 13, color: colors.textSecondary },
  rowValue: { fontSize: 13, color: colors.text, fontWeight: '500' },
  rowValueHighlight: { color: colors.primary, fontWeight: 'bold', fontSize: 15 },
  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: colors.primary, marginBottom: 6 },
  emptyText: { fontSize: 15, color: colors.textSecondary, marginBottom: 24, textAlign: 'center' },
  buyBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 13,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  buyBtnText: { color: colors.white, fontWeight: 'bold', fontSize: 16 },
  error: { color: colors.error, textAlign: 'center', marginTop: 12, paddingHorizontal: 16 },
  guestContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  guestIcon: { fontSize: 64, marginBottom: 16 },
  guestTitle: { fontSize: 22, fontWeight: 'bold', color: colors.primary, marginBottom: 8 },
  guestText: { fontSize: 15, color: colors.textSecondary, textAlign: 'center', marginBottom: 28 },
  loginBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
  },
  loginBtnText: { color: colors.white, fontWeight: 'bold', fontSize: 16 },
  registerBtn: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.primary,
    paddingVertical: 13,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
  },
  registerBtnText: { color: colors.primary, fontWeight: 'bold', fontSize: 16 },
  codigoBox: {
    marginTop: 10,
    backgroundColor: '#fff5f5',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  codigoLabel: { fontSize: 12, color: colors.primary, fontWeight: '600', marginBottom: 8 },
  codigoCodigo: { fontSize: 18, fontWeight: 'bold', letterSpacing: 4, color: colors.primary, marginTop: 6 },
  qrPreviewBox: { padding: 6, backgroundColor: '#fff', borderRadius: 4 },
  liberarRow: { alignItems: 'flex-end', marginTop: 10 },
  liberarBtn: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 6,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  liberarText: { fontSize: 12, color: colors.primary, fontWeight: '600' },
  backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  backIcon: { color: colors.white, fontSize: 32, lineHeight: 36, fontWeight: '300' },
});
