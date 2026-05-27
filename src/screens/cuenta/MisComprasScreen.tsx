import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import api from '../../services/api';
import { colors } from '../../theme/colors';
import { Compra } from '../../types';

function fmtMoney(n: number) {
  return `${(n ?? 0).toFixed(2)} €`;
}
function fmtDate(s?: string) {
  if (!s) return '';
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const STATUS_MAP: Record<string, { label: string; bg: string; fg: string }> = {
  paid:       { label: 'PAGADO',    bg: '#e8f5ee', fg: '#1d6b3c' },
  pagado:     { label: 'PAGADO',    bg: '#e8f5ee', fg: '#1d6b3c' },
  completed:  { label: 'COMPLETADO',bg: '#e8f5ee', fg: '#1d6b3c' },
  pending:    { label: 'PENDIENTE', bg: '#fff3e0', fg: '#a35200' },
  pendiente:  { label: 'PENDIENTE', bg: '#fff3e0', fg: '#a35200' },
  refunded:   { label: 'REEMBOLSADO', bg: '#e3f2fd', fg: '#1565c0' },
  cancelled:  { label: 'CANCELADO', bg: '#fce8e8', fg: '#a51c1c' },
  cancelado:  { label: 'CANCELADO', bg: '#fce8e8', fg: '#a51c1c' },
};
function statusPill(s?: string) {
  const k = (s || '').toLowerCase();
  return STATUS_MAP[k] || { label: (s || '—').toUpperCase(), bg: colors.border, fg: colors.text };
}

export default function MisComprasScreen() {
  const navigation = useNavigation<any>();
  const [items, setItems] = useState<Compra[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const { data } = await api.get<any>('/api/me/orders');
      const lista: Compra[] = Array.isArray(data) ? data : (data?.orders ?? data?.compras ?? []);
      setItems(lista);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.back}>‹</Text></TouchableOpacity>
          <Text style={styles.headerTitle}>Mis Compras</Text>
          <View style={{ width: 32 }} />
        </View>
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.back}>‹</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>Mis Compras</Text>
        <View style={{ width: 32 }} />
      </View>

      {items.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>📦</Text>
          <Text style={styles.emptyTitle}>Aún no tienes compras</Text>
          <Text style={styles.emptyText}>Las entradas y abonos que adquieras aparecerán aquí.</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => String(it.id)}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          renderItem={({ item }) => {
            const ref = item.reference || item.referencia || `#${item.id}`;
            const fecha = item.created_at || item.fecha;
            const total = Number(item.total ?? 0);
            const status = statusPill(item.status || item.estado);
            return (
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('MisComprasDetalle', { id: item.id })}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.ref}>{ref}</Text>
                  <Text style={styles.fecha}>{fmtDate(fecha)}</Text>
                  <View style={[styles.pill, { backgroundColor: status.bg }]}>
                    <Text style={[styles.pillText, { color: status.fg }]}>{status.label}</Text>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.total}>{fmtMoney(total)}</Text>
                  <Text style={styles.arrow}>›</Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 12,
  },
  back: { color: colors.white, fontSize: 28, fontWeight: '800', width: 32 },
  headerTitle: { color: colors.white, fontSize: 18, fontWeight: '800' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 8 },
  emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
  },
  ref: { fontSize: 14, fontWeight: '800', color: colors.text },
  fecha: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  pill: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, marginTop: 8 },
  pillText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },
  total: { fontSize: 16, fontWeight: '800', color: colors.primary },
  arrow: { fontSize: 24, color: colors.textSecondary, marginTop: 6 },
});
