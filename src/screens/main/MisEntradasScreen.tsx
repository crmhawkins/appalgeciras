import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  RefreshControl, TouchableOpacity, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import QRCode from 'react-native-qrcode-svg';
import { useKeepAwake } from 'expo-keep-awake';
import api from '../../services/api';
import { colors } from '../../theme/colors';
import { Entrada } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { ESTADIO } from '../../constants';

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

const ESTADO_COLOR: Record<Entrada['estado'], string> = {
  valida: '#1a8a3b',
  pendiente: '#e07b00',
  usada: '#888888',
  cancelada: '#C8102E',
};

const ESTADO_LABEL: Record<Entrada['estado'], string> = {
  valida: 'Válida',
  pendiente: 'Pendiente',
  usada: 'Usada',
  cancelada: 'Cancelada',
};

function formatDate(d?: string): string {
  if (!d) return '—';
  try {
    const [y, m, day] = d.split('T')[0].split('-');
    return `${day}/${m}/${y}`;
  } catch { return d; }
}

export default function MisEntradasScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const [entradas, setEntradas] = useState<Entrada[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrModal, setQrModal] = useState<QRModalData | null>(null);

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setError(null);
    try {
      const { data } = await api.get<{ entradas: Entrada[] }>(`/api/entradas/usuario/${user.id}`);
      const lista = Array.isArray(data) ? data : ((data as any).entradas ?? []);
      setEntradas(lista);
    } catch (e: any) {
      setError(e?.response?.data?.msg || e?.message || 'Error cargando entradas');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  if (!user) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Mis Entradas</Text>
        </View>
        <View style={styles.guestContainer}>
          <Text style={styles.guestIcon}>🏟️</Text>
          <Text style={styles.guestTitle}>Inicia sesión</Text>
          <Text style={styles.guestText}>Para ver tus entradas necesitas una cuenta</Text>
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
          <Text style={styles.headerTitle}>Mis Entradas</Text>
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <QRFullscreenModal data={qrModal} onClose={() => setQrModal(null)} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🏟️ Mis Entradas</Text>
        <Text style={styles.headerSub}>{ESTADIO}</Text>
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
      <FlatList
        data={entradas}
        keyExtractor={(e) => String(e.id)}
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
              <Text style={styles.emptyIcon}>🏟️</Text>
              <Text style={styles.emptyTitle}>Sin entradas</Text>
              <Text style={styles.emptyText}>¡Compra tu entrada para el próximo partido!</Text>
              <TouchableOpacity
                style={styles.buyBtn}
                onPress={() => navigation.getParent()?.navigate('Tabs', { screen: 'AbonosTab' })}
              >
                <Text style={styles.buyBtnText}>Ver entradas disponibles</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 16, textAlign: 'center', paddingHorizontal: 32 }}>
                Compra tu entrada para cualquier partido de local del Algeciras CF
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const estadoColor = ESTADO_COLOR[item.estado] ?? '#888';
          const partido = item.Partido;
          const asiento = item.Asiento;
          return (
            <View style={[styles.card, { borderLeftColor: estadoColor }]}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardPartido}>
                  {partido
                    ? `${partido.equipoLocal} vs ${partido.equipoVisitante}`
                    : `Entrada #${item.id}`}
                </Text>
                <View style={[styles.badge, { backgroundColor: estadoColor + '22' }]}>
                  <Text style={[styles.badgeText, { color: estadoColor }]}>
                    {ESTADO_LABEL[item.estado]}
                  </Text>
                </View>
              </View>
              <View style={styles.divider} />
              {partido && (
                <Row label="Fecha" value={`${formatDate(partido.fecha)}${partido.hora ? ' · ' + partido.hora : ''}`} />
              )}
              {asiento && (
                <Row
                  label="Asiento"
                  value={`${asiento.Sector?.nombre ?? 'Sector'} — Fila ${asiento.fila} — Nº ${asiento.numero}`}
                />
              )}
              <Row label="Precio" value={`${item.precio} €`} highlight />
              {item.tipo && <Row label="Tipo" value={item.tipo} />}
              {item.metodoPago && <Row label="Pago" value={item.metodoPago} />}
              {(item.codigoAcceso || item.token) && (
                <TouchableOpacity
                  style={styles.codigoBox}
                  onPress={() => {
                    const qrValue = item.codigoAcceso || item.token || '';
                    const partido = item.Partido;
                    const asiento = item.Asiento;
                    setQrModal({
                      value: qrValue,
                      titulo: partido
                        ? `${partido.equipoLocal} vs ${partido.equipoVisitante}`
                        : `Entrada #${item.id}`,
                      subtitulo: asiento
                        ? `${asiento.Sector?.nombre ?? 'Sector'} — Fila ${asiento.fila} — Nº ${asiento.numero}`
                        : item.codigoAcceso ?? '',
                    });
                  }}
                  activeOpacity={0.75}
                >
                  <Text style={styles.codigoLabel}>Código de acceso · Toca para ampliar</Text>
                  <View style={styles.qrPreviewBox}>
                    <QRCode value={item.codigoAcceso || item.token || 'invalid'} size={80} />
                  </View>
                  <Text style={styles.codigoCodigo}>{item.codigoAcceso ?? ''}</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        }}
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 16, backgroundColor: colors.primary },
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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardPartido: { fontSize: 15, fontWeight: 'bold', color: colors.text, flex: 1, marginRight: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  divider: { height: 1, backgroundColor: colors.border, marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  rowLabel: { fontSize: 13, color: colors.textSecondary },
  rowValue: { fontSize: 13, color: colors.text, fontWeight: '500', flex: 1, textAlign: 'right' },
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
    borderColor: '#C8102E',
    borderStyle: 'dashed',
  },
  codigoLabel: { fontSize: 11, color: '#C8102E', fontWeight: '600', marginBottom: 8 },
  codigoCodigo: { fontSize: 18, fontWeight: 'bold', letterSpacing: 4, color: '#C8102E', marginTop: 6 },
  qrPreviewBox: { padding: 6, backgroundColor: '#fff', borderRadius: 4 },
});
