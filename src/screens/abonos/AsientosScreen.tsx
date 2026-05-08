import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import api from '../../services/api';
import { colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { Asiento, AbonosStackParamList } from '../../types';



type AsientosRouteProp = RouteProp<AbonosStackParamList, 'Asientos'>;

export default function AsientosScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<AsientosRouteProp>();
  const { sectorId, sectorNombre, precio } = route.params;
  const { token } = useAuth();

  const [asientos, setAsientos] = useState<Asiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const { data } = await api.get<{ asientos: Asiento[] }>(
        `/api/asientos/sector/${sectorId}`,
        { params: { partidoId: 'proximos' } },
      );
      setAsientos(data.asientos ?? []);
    } catch (e: any) {
      setError(e?.response?.data?.msg || e?.message || 'Error cargando asientos');
    } finally {
      setLoading(false);
    }
  }, [sectorId]);

  useEffect(() => { load(); }, [load]);

  const selected = useMemo(
    () => asientos.find((a) => a.id === selectedId) ?? null,
    [asientos, selectedId],
  );

  const filas = useMemo(() => {
    const map: Record<string, Asiento[]> = {};
    for (const a of asientos) {
      const key = String(a.fila ?? '-');
      if (!map[key]) map[key] = [];
      map[key].push(a);
    }
    Object.values(map).forEach((arr) =>
      arr.sort((x, y) => Number(x.numero) - Number(y.numero)),
    );
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [asientos]);

  const onSelectSeat = (a: Asiento) => {
    if (a.estado !== 'disponible') return;
    setSelectedId(a.id === selectedId ? null : a.id);
  };

  const onBuy = () => {
    if (!selected) return;
    if (!token) {
      navigation.navigate('Auth', { screen: 'Login' });
      return;
    }
    navigation.navigate('Checkout', {
      sectorId,
      sectorNombre,
      asientoId: selected.id,
      fila: selected.fila,
      numero: selected.numero,
      precio,
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>{sectorNombre}</Text>
          <Text style={styles.headerSub}>Paso 3 de 3 · Selecciona asiento · {precio} €</Text>
        </View>
      </View>

      <View style={styles.legend}>
        <LegendDot color={colors.available} label="Disponible" />
        <LegendDot color={colors.occupied} label="Ocupado" />
        <LegendDot color={colors.selected} label="Seleccionado" />
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <ScrollView contentContainerStyle={styles.grid}>
        {filas.length === 0 && !error && (
          <Text style={styles.empty}>No hay asientos para este sector</Text>
        )}
        {filas.map(([fila, asientosFila]) => (
          <View key={fila} style={styles.row}>
            <Text style={styles.rowLabel}>F{fila}</Text>
            <View style={styles.seatsRow}>
              {asientosFila.map((a) => {
                const isSelected = a.id === selectedId;
                const bg =
                  a.estado !== 'disponible'
                    ? colors.occupied
                    : isSelected
                    ? colors.selected
                    : colors.available;
                return (
                  <TouchableOpacity
                    key={a.id}
                    style={[styles.seat, { backgroundColor: bg }]}
                    onPress={() => onSelectSeat(a)}
                    disabled={a.estado !== 'disponible'}
                    accessibilityLabel={`Asiento ${a.numero} fila ${a.fila}, ${a.estado}`}
                  >
                    <Text style={styles.seatText}>{a.numero}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        {selected ? (
          <View style={styles.footerSelected}>
            <View>
              <Text style={styles.footerSeatLabel}>Asiento seleccionado</Text>
              <Text style={styles.footerSeatInfo}>Fila {selected.fila} · Nº {selected.numero}</Text>
            </View>
            <Text style={styles.footerPrice}>{precio} €</Text>
          </View>
        ) : (
          <Text style={styles.footerText}>Toca un asiento verde para seleccionarlo</Text>
        )}
        <TouchableOpacity
          style={[styles.buyBtn, !selected && styles.buyBtnDisabled]}
          onPress={onBuy}
          disabled={!selected}
          accessibilityLabel={selected ? `Comprar abono, asiento ${selected.numero} fila ${selected.fila}, ${precio} €` : 'Comprar abono, selecciona un asiento primero'}
        >
          <Text style={styles.buyBtnText}>
            {token ? '🛒 Comprar Abono' : 'Iniciar sesión para comprar'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 8, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center' },
  headerTitle: { color: colors.white, fontSize: 20, fontWeight: 'bold' },
  headerSub: { color: colors.white, opacity: 0.85, marginTop: 2 },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  legendDot: { width: 14, height: 14, borderRadius: 4, marginRight: 6 },
  legendText: { fontSize: 12, color: colors.text },
  grid: { padding: 12 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  rowLabel: { width: 32, fontWeight: 'bold', color: colors.text },
  seatsRow: { flexDirection: 'row', flexWrap: 'wrap', flex: 1 },
  seat: {
    width: 36, height: 36, borderRadius: 6,
    margin: 3, justifyContent: 'center', alignItems: 'center',
  },
  seatText: { color: colors.white, fontSize: 12, fontWeight: 'bold' },
  footer: {
    padding: 16,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerText: { color: colors.text, marginBottom: 10, textAlign: 'center' },
  footerSelected: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  footerSeatLabel: { fontSize: 12, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  footerSeatInfo: { fontSize: 15, fontWeight: 'bold', color: colors.text, marginTop: 2 },
  footerPrice: { fontSize: 22, fontWeight: 'bold', color: colors.primary },
  buyBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buyBtnDisabled: { opacity: 0.5 },
  buyBtnText: { color: colors.white, fontWeight: 'bold', fontSize: 16 },
  empty: { textAlign: 'center', color: colors.textSecondary, marginTop: 24 },
  error: { color: colors.error, textAlign: 'center', marginTop: 8, paddingHorizontal: 16 },
  backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  backIcon: { color: colors.white, fontSize: 32, lineHeight: 36, fontWeight: '300' },
});
