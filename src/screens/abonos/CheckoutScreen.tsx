import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
import api from '../../services/api';
import { colors } from '../../theme/colors';
import { AbonosStackParamList } from '../../types';

type CheckoutRouteProp = RouteProp<AbonosStackParamList, 'Checkout'>;

export default function CheckoutScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<CheckoutRouteProp>();
  const { sectorId, sectorNombre, asientoId, fila, numero, precio } = route.params;
  const [loading, setLoading] = useState(false);

  const handlePay = async () => {
    setLoading(true);
    try {
      const { data } = await api.post<{ url: string }>('/api/pagos/create-checkout', {
        asientoId,
        sectorId,
        cantidad: precio,
      });
      if (!data?.url) throw new Error('URL de pago no recibida');
      const result = await WebBrowser.openBrowserAsync(data.url);
      if (result.type === 'cancel' || result.type === 'dismiss') {
        Alert.alert('Pago', 'Pago cancelado o finalizado. Verifica en tu perfil.');
      }
      navigation.navigate('Gradas');
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        'No se pudo iniciar el pago';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Resumen del Abono</Text>
      </View>

      <View style={styles.card}>
        <Row label="Sector" value={sectorNombre} />
        <Row label="Fila" value={String(fila)} />
        <Row label="Asiento" value={String(numero)} />
        <View style={styles.divider} />
        <Row label="Precio" value={`${precio} €`} highlight />
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.payBtn, loading && styles.payBtnDisabled]}
          onPress={handlePay}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.payBtnText}>Pagar con Stripe</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => navigation.goBack()}
          disabled={loading}
        >
          <Text style={styles.cancelBtnText}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function Row({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, highlight && styles.rowValueHighlight]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { padding: 16, backgroundColor: colors.primary },
  headerTitle: { color: colors.white, fontSize: 20, fontWeight: 'bold' },
  card: {
    backgroundColor: colors.white,
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  rowLabel: { color: colors.textSecondary, fontSize: 14 },
  rowValue: { color: colors.text, fontSize: 16, fontWeight: '600' },
  rowValueHighlight: { color: colors.primary, fontSize: 20, fontWeight: 'bold' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 8 },
  footer: { padding: 16 },
  payBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  payBtnDisabled: { opacity: 0.6 },
  payBtnText: { color: colors.white, fontWeight: 'bold', fontSize: 16 },
  cancelBtn: { paddingVertical: 12, alignItems: 'center', marginTop: 8 },
  cancelBtnText: { color: colors.textSecondary },
});
