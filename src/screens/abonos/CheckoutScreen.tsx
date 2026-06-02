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
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useStripe } from '@stripe/stripe-react-native';
import * as Haptics from 'expo-haptics';
import api from '../../services/api';
import { clearCached } from '../../services/cache';
import { colors } from '../../theme/colors';
import { AbonosStackParamList } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { ESCUDO_URL, TEMPORADA_CORTA, COMPETICION, ESTADIO } from '../../constants';

type CheckoutRouteProp = RouteProp<AbonosStackParamList, 'Checkout'>;

interface PaymentSheetResponse {
  paymentIntent: string;
  ephemeralKey: string;
  customer: string;
  publishableKey: string;
  orderReference: string;
}

interface SyncResponse {
  status: 'paid' | 'pending' | 'failed' | 'refunded' | string;
  reference: string;
  total: number;
}

export default function CheckoutScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AbonosStackParamList>>();
  const route = useRoute<CheckoutRouteProp>();
  const { user } = useAuth();
  const { sectorId, sectorNombre, asientoId, fila, numero, precio } = route.params;
  const [loading, setLoading] = useState(false);
  const [dni, setDni] = useState(user?.dni || '');
  const [dniError, setDniError] = useState<string | null>(null);
  const dniFromProfile = !!user?.dni;

  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const handlePay = async () => {
    if (!user) { Alert.alert('Error', 'Debes iniciar sesión'); return; }
    if (!dni.trim()) {
      setDniError('El DNI es obligatorio para recibir tu código de acceso');
      return;
    }
    setDniError(null);
    setLoading(true);

    try {
      // 1) Pedir al backend los params del PaymentSheet.
      //    El backend crea Order pending + PaymentIntent + Stripe Customer
      //    + EphemeralKey y nos devuelve todo en una sola request.
      //
      //    Por ahora la app sólo envía 1 item (el abono del asiento elegido).
      //    Cuando metamos carrito completo, el body lleva items[] real.
      const productIdFromAsiento = asientoId; // TODO: mapping asientoId → Product abono cuando exista el endpoint
      const { data: sheet } = await api.post<PaymentSheetResponse>(
        '/api/checkout/payment-sheet',
        {
          items: [
            { productId: productIdFromAsiento, qty: 1 },
          ],
          customer: {
            first_name: user.nombre?.split(' ')[0] || user.nombre || 'Socio',
            last_name:  user.nombre?.split(' ').slice(1).join(' ') || 'Algeciras',
            email:      user.email,
            phone:      user.telefono || '',
            dni:        dni.trim(),
            address:    user.direccion || 'Dirección pendiente',
            city:       'Algeciras',
            province:   'Cádiz',
            postal_code:'11201',
          },
          channel: 'app',
        },
      );

      if (!sheet?.paymentIntent) throw new Error('Respuesta inválida del backend');

      // 2) Inicializar PaymentSheet con los params del backend.
      const init = await initPaymentSheet({
        merchantDisplayName: 'Algeciras Club de Fútbol',
        paymentIntentClientSecret: sheet.paymentIntent,
        customerId: sheet.customer,
        customerEphemeralKeySecret: sheet.ephemeralKey,
        defaultBillingDetails: {
          name:  user.nombre || '',
          email: user.email,
        },
        allowsDelayedPaymentMethods: false,
        returnURL: 'algecirascf://stripe-redirect',
      });
      if (init.error) throw new Error(init.error.message || 'Error inicializando pago');

      // 3) Presentar PaymentSheet. Usuario elige tarjeta / Apple Pay / Google Pay.
      const result = await presentPaymentSheet();
      if (result.error) {
        if (result.error.code !== 'Canceled') {
          Alert.alert('Pago no completado', result.error.message || 'Inténtalo de nuevo');
        }
        setLoading(false);
        return;
      }

      // 4) Sincronizar con backend para confirmar status real
      //    (el webhook llegará en paralelo, pero esto da feedback inmediato).
      const { data: sync } = await api.post<SyncResponse>('/api/checkout/sync', {
        orderReference:  sheet.orderReference,
        paymentIntentId: sheet.paymentIntent.split('_secret_')[0], // pi_XXX from pi_XXX_secret_YYY
      });

      if (sync.status === 'paid') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await clearCached('socios_abonos_' + user?.id);
        await clearCached('perfil_abonos_' + user?.id);
        Alert.alert(
          '¡Pago completado!',
          `Pedido ${sync.reference}. Tu abono se enviará por email con el QR.`,
        );
        navigation.getParent()?.navigate('Tabs', { screen: 'PerfilTab' });
      } else {
        Alert.alert(
          'Pago en proceso',
          'Estamos confirmando con el banco. Cuando termine recibirás email y el abono aparecerá en tu cuenta.',
        );
        navigation.navigate('Gradas');
      }
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.msg ||
        e?.message ||
        'No se pudo procesar el pago';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Resumen del Abono</Text>
        <Text style={styles.headerSub}>Temporada {TEMPORADA_CORTA} · {COMPETICION.split(' · ')[0]}</Text>
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1 }}>
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
          accessibilityLabel={`Pagar ${precio} € con Stripe`}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.payBtnText}>💳 Pagar {precio} €</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => navigation.goBack()}
          disabled={loading}
          accessibilityLabel="Cancelar compra"
        >
          <Text style={styles.cancelBtnText}>Cancelar</Text>
        </TouchableOpacity>
      </View>
      </ScrollView>
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
