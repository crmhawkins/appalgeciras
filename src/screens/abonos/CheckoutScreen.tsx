import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
import * as Haptics from 'expo-haptics';
import api from '../../services/api';
import { colors } from '../../theme/colors';
import { AbonosStackParamList } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { ESCUDO_URL, TEMPORADA_CORTA, COMPETICION, ESTADIO } from '../../constants';

type CheckoutRouteProp = RouteProp<AbonosStackParamList, 'Checkout'>;

export default function CheckoutScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<CheckoutRouteProp>();
  const { user } = useAuth();
  const { sectorId, sectorNombre, asientoId, fila, numero, precio } = route.params;
  const [loading, setLoading] = useState(false);
  const [dni, setDni] = useState((user as any)?.dni || '');
  const [dniError, setDniError] = useState<string | null>(null);
  const dniFromProfile = !!(user as any)?.dni;

  const handlePay = async () => {
    if (!dni.trim()) {
      setDniError('El DNI es obligatorio para recibir tu código de acceso');
      return;
    }
    setDniError(null);
    setLoading(true);
    try {
      const { data } = await api.post<{ url: string; sessionId?: string }>('/api/pagos/create-checkout', {
        asientoId,
        sectorId,
        precio,
        dni: dni.trim(),
        email: (user as any)?.email || '',
        nombre: (user as any)?.nombre || '',
        tipo: 'abono',
      });
      if (!data?.url) throw new Error('URL de pago no recibida');
      const sessionId = data.sessionId;
      await WebBrowser.openBrowserAsync(data.url);

      // Verificar estado real del pago tras cerrar el browser
      try {
        const { data: statusData } = await api.get<{ completado: boolean }>(`/api/pagos/status?session_id=${sessionId}`);
        if (statusData?.completado) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert('¡Pago completado!', 'Tu abono ha sido procesado. Recibirás confirmación por email.');
          navigation.getParent()?.navigate('Tabs', { screen: 'PerfilTab' });
        } else {
          Alert.alert('Pago no completado', 'Si cerraste antes de terminar, puedes intentarlo de nuevo.');
          navigation.navigate('Gradas');
        }
      } catch {
        Alert.alert('Pago', 'Si completaste el pago recibirás confirmación por email.');
        navigation.navigate('Gradas');
      }
    } catch (e: any) {
      const msg =
        e?.response?.data?.msg ||
        e?.response?.data?.message ||
        e?.message ||
        'No se pudo iniciar el pago';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Resumen del Abono</Text>
        <Text style={styles.headerSub}>Temporada {TEMPORADA_CORTA} · {COMPETICION.split(' · ')[0]}</Text>
      </View>

      <View style={styles.clubCard}>
        <Image
          source={{ uri: ESCUDO_URL }}
          style={styles.clubEscudo}
          resizeMode="contain"
        />
        <View>
          <Text style={styles.clubName}>Algeciras Club de Fútbol</Text>
          <Text style={styles.clubInfo}>{ESTADIO} · 8.500 espectadores</Text>
          <Text style={styles.clubInfo}>{COMPETICION}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Row label="Sector" value={sectorNombre} />
        <Row label="Fila" value={String(fila)} />
        <Row label="Asiento" value={String(numero)} />
        <View style={styles.divider} />
        <Row label="Precio" value={`${precio} €`} highlight />
      </View>

      <View style={styles.dniContainer}>
        <Text style={styles.dniLabel}>DNI (obligatorio para entrada al estadio)</Text>
        <TextInput
          style={[styles.dniInput, dniError ? styles.dniInputError : null]}
          placeholder="12345678Z"
          autoCapitalize="characters"
          value={dni}
          onChangeText={(text) => {
            setDni(text);
            if (text.trim()) setDniError(null);
          }}
        />
        {dniFromProfile && !dniError && (
          <Text style={styles.dniHint}>✓ Obtenido de tu perfil</Text>
        )}
        {dniError && <Text style={styles.dniErrorText}>{dniError}</Text>}
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
            <Text style={styles.payBtnText}>💳 Pagar {precio} € con Stripe</Text>
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
  headerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },
  clubCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, marginHorizontal: 16, marginTop: 16, marginBottom: 0, borderRadius: 12, padding: 14, gap: 12, borderLeftWidth: 4, borderLeftColor: colors.primary },
  clubEscudo: { width: 48, height: 48 },
  clubName: { fontSize: 15, fontWeight: 'bold', color: colors.text },
  clubInfo: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
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
  dniContainer: { marginHorizontal: 16, marginBottom: 8 },
  dniLabel: { fontSize: 13, color: colors.textSecondary, marginBottom: 6, fontWeight: '500' },
  dniInput: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.text,
  },
  dniInputError: { borderColor: colors.error },
  dniErrorText: { color: colors.error, fontSize: 12, marginTop: 4 },
  dniHint: { color: colors.primary, fontSize: 12, marginTop: 4 },
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
