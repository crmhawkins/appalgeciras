import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import api from '../../services/api';
import { colors } from '../../theme/colors';
import { Compra, CompraItem } from '../../types';

function fmtMoney(n: number) { return `${(n ?? 0).toFixed(2)} €`; }
function fmtDate(s?: string) {
  if (!s) return '';
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
}

export default function MisComprasDetalleScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const id = route?.params?.id;
  const [item, setItem] = useState<Compra | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Primero intentamos endpoint dedicado, si no existe caemos al listado
        let found: Compra | null = null;
        try {
          const { data } = await api.get<any>(`/api/me/orders/${id}`);
          found = data?.order || data?.compra || data;
        } catch {
          const { data } = await api.get<any>('/api/me/orders');
          const lista: Compra[] = Array.isArray(data) ? data : (data?.orders ?? data?.compras ?? []);
          found = lista.find((x) => Number(x.id) === Number(id)) || null;
        }
        if (!cancelled) setItem(found);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()}><Text style={styles.back}>‹</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>Detalle compra</Text>
        <View style={{ width: 32 }} />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : !item ? (
        <View style={styles.center}><Text style={styles.dim}>No se encontró la compra.</Text></View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Resumen</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Referencia</Text>
              <Text style={styles.value}>{item.reference || item.referencia || `#${item.id}`}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Fecha</Text>
              <Text style={styles.value}>{fmtDate(item.created_at || item.fecha)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Estado</Text>
              <Text style={styles.value}>{(item.status || item.estado || '—').toUpperCase()}</Text>
            </View>
            <View style={[styles.row, styles.rowTotal]}>
              <Text style={styles.totalLabel}>TOTAL</Text>
              <Text style={styles.totalValue}>{fmtMoney(Number(item.total ?? 0))}</Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Artículos</Text>
            {!item.items || item.items.length === 0 ? (
              <Text style={styles.dim}>Sin detalle de artículos disponible.</Text>
            ) : (
              item.items.map((it: CompraItem, idx: number) => (
                <View key={idx} style={styles.itemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName} numberOfLines={2}>
                      {it.nombre || it.descripcion || `Artículo #${it.id ?? idx + 1}`}
                    </Text>
                    {it.cantidad ? (
                      <Text style={styles.itemMeta}>x {it.cantidad}</Text>
                    ) : null}
                  </View>
                  <Text style={styles.itemTotal}>
                    {fmtMoney(Number(it.total ?? it.precio ?? 0))}
                  </Text>
                </View>
              ))
            )}
          </View>
        </ScrollView>
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
  dim: { color: colors.textSecondary, fontSize: 14 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
  },
  cardTitle: { fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  rowTotal: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 6, paddingTop: 10 },
  label: { fontSize: 13, color: colors.textSecondary },
  value: { fontSize: 13, color: colors.text, fontWeight: '700' },
  totalLabel: { fontSize: 14, fontWeight: '800', color: colors.text, letterSpacing: 0.5 },
  totalValue: { fontSize: 18, fontWeight: '800', color: colors.primary },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemName: { fontSize: 14, fontWeight: '700', color: colors.text },
  itemMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  itemTotal: { fontSize: 14, fontWeight: '800', color: colors.primary, marginLeft: 12 },
});
