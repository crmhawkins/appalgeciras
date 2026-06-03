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
import * as WebBrowser from 'expo-web-browser';
import * as Haptics from 'expo-haptics';
import api, { API_BASE_URL } from '../../services/api';
import { humanizeError } from '../../services/errors';
import { clearCached } from '../../services/cache';
import { getToken } from '../../services/auth';
import { colors } from '../../theme/colors';
import { AbonosStackParamList } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { ESCUDO_URL, TEMPORADA_CORTA, COMPETICION, ESTADIO } from '../../constants';

type CheckoutRouteProp = RouteProp<AbonosStackParamList, 'Checkout'>;

interface CreateOrderResp {
  orderReference: string;
  checkoutUrl: string;   // URL to open in browser to pay via Stripe Elements
}

interface SyncResp {
  status: 'paid' | 'pending' | 'failed' | string;
  reference: string;
}

/**
 * Checkout — flujo de pago via web.
 *
 * El cliente confirma la compra → llamamos al backend que crea Order(pending)
 * y devuelve una URL de checkout web (Stripe Elements montado en Laravel).
 * Abrimos esa URL en un navegador (WebBrowser de Expo, que en iOS abre SFAuthenticationSession
 * tipo Apple-Pay-flujo seguro). El cliente paga ahí. Al cerrar el browser:
 *   1. Comprobamos status real via /api/checkout/sync
 *   2. Si paid → navegamos a "Mis Abonos" + emitimos Haptic success
 *   3. Si pending/failed → mostramos mensaje y dejamos al cliente reintentar
 *
 * Hicimos este flujo en vez del @stripe/stripe-react-native PaymentSheet
 * nativo porque éste último daba problemas de compilación iOS con RN 0.81.5
 * + Xcode 26 (cannot find protocol definition for STP* / PK*). WebView/browser
 * es más simple, sigue funcionando con Apple Pay si el navegador del sistema
 * lo soporta, y cuando el club migre de Stripe a Redsys (próximo paso),
 * sólo cambia la URL del backend — la app no toca nada.
 */
export default function CheckoutScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AbonosStackParamList>>();
  const route = useRoute<CheckoutRouteProp>();
  const { user } = useAuth();
  const { sectorId, sectorNombre, asientoId, fila, numero, precio } = route.params;
  const [loading, setLoading] = useState(false);
  const [dni, setDni] = useState(user?.dni || '');
  const [dniError, setDniError] = useState<string | null>(null);
  const dniFromProfile = !!user?.dni;

  // Cupón descuento
  const [couponCode, setCouponCode] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);

  const gestionFee = Math.floor(precio * 0.05 * 100) / 100;
  const totalBruto = Number(precio) + gestionFee;
  const totalFinal = Math.max(0, totalBruto - couponDiscount);

  const handleApplyCoupon = async () => {
    const code = couponCode.trim().toUpperCase();
    if (!code) {
      setCouponError('Introduce un código');
      return;
    }
    setCouponLoading(true);
    setCouponError(null);
    try {
      const { data } = await api.post<{
        valid: boolean;
        discount_amount?: number;
        message?: string;
      }>('/api/checkout/coupon/preview', {
        code,
        subtotal: Number(precio),
        product_type: 'abono',
      });

      if (data?.valid) {
        setCouponApplied(true);
        setCouponDiscount(Number(data.discount_amount) || 0);
        setCouponCode(code);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        setCouponError(data?.message || 'Código no válido');
      }
    } catch (e: any) {
      setCouponError(humanizeError(e));
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponApplied(false);
    setCouponDiscount(0);
    setCouponCode('');
    setCouponError(null);
  };

  const handlePay = async () => {
    if (!user) { Alert.alert('Error', 'Debes iniciar sesión'); return; }
    if (!dni.trim()) {
      setDniError('El DNI es obligatorio para recibir tu código de acceso');
      return;
    }
    setDniError(null);
    setLoading(true);

    try {
      // 1) Llamar al backend para crear Order(pending) y obtener URL de checkout web.
      //    Si el endpoint no existe aún (pasarela en montaje), avisamos sin crashear.
      const token = await getToken();
      const { data } = await api.post<CreateOrderResp>('/api/checkout/web-redirect', {
        sectorId,
        asientoId,
        precio,
        dni: dni.trim(),
        type: 'abono',
        coupon_code: couponApplied ? couponCode : undefined,
      });

      if (!data?.checkoutUrl) {
        Alert.alert(
          'Pasarela en montaje',
          'El cobro online estará disponible en breve. Mientras tanto, contacta con el club para reservar tu plaza.',
        );
        return;
      }

      // 2) Abrir el checkout web (Stripe Elements / Redsys cuando esté).
      //    WebBrowser usa SFAuthenticationSession en iOS — UX como Apple Pay.
      const url = data.checkoutUrl + (data.checkoutUrl.includes('?') ? '&' : '?') +
                  `native=1&token=${encodeURIComponent(token || '')}`;
      await WebBrowser.openBrowserAsync(url, {
        dismissButtonStyle: 'cancel',
        readerMode: false,
        toolbarColor: colors.primary,
      });

      // 3) Tras cerrar el browser, sincronizar status real con el backend.
      try {
        const { data: sync } = await api.post<SyncResp>('/api/checkout/sync', {
          orderReference: data.orderReference,
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
        } else if (sync.status === 'pending') {
          Alert.alert(
            'Pago en proceso',
            'Estamos confirmando con el banco. Recibirás email cuando termine.',
          );
          navigation.navigate('Gradas');
        } else {
          Alert.alert(
            'Pago no completado',
            'Si cerraste antes de pagar puedes intentarlo de nuevo desde "Comprar".',
          );
          navigation.navigate('Gradas');
        }
      } catch {
        Alert.alert(
          'Pago',
          'Si completaste el pago, recibirás email con tu abono. Si no, vuelve a intentarlo.',
        );
        navigation.navigate('Gradas');
      }
    } catch (e: any) {
      Alert.alert('Error', humanizeError(e, 'checkout'));
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
        <Row label="Subtotal" value={`${Number(precio).toFixed(2)} €`} />
        <Row label="Gastos de gestión (5%)" value={`${gestionFee.toFixed(2)} €`} />
        {couponApplied && couponDiscount > 0 && (
          <Row
            label={`Descuento ${couponCode}`}
            value={`−${couponDiscount.toFixed(2)} €`}
            discount
          />
        )}
        <View style={styles.divider} />
        <Row label="Total" value={`${totalFinal.toFixed(2)} €`} highlight />
      </View>

      {/* Caja del cupón */}
      <View style={styles.couponContainer}>
        <Text style={styles.couponLabel}>Código de descuento</Text>
        <View style={styles.couponRow}>
          <TextInput
            style={[styles.couponInput, couponApplied && styles.couponInputDisabled]}
            placeholder="ALGECIRAS25"
            autoCapitalize="characters"
            autoCorrect={false}
            value={couponCode}
            editable={!couponApplied && !couponLoading}
            onChangeText={(t) => {
              setCouponCode(t.toUpperCase());
              if (couponError) setCouponError(null);
            }}
          />
          {couponApplied ? (
            <TouchableOpacity
              style={styles.couponBtnRemove}
              onPress={handleRemoveCoupon}
              accessibilityLabel="Quitar cupón"
            >
              <Text style={styles.couponBtnText}>Quitar</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.couponBtn,
                (couponLoading || !couponCode.trim()) && styles.couponBtnDisabled,
              ]}
              onPress={handleApplyCoupon}
              disabled={couponLoading || !couponCode.trim()}
              accessibilityLabel="Aplicar cupón"
            >
              {couponLoading ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <Text style={styles.couponBtnText}>Aplicar</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
        {couponApplied && couponDiscount > 0 && (
          <Text style={styles.couponSuccess}>
            ✓ Cupón aplicado: −{couponDiscount.toFixed(2)} €
          </Text>
        )}
        {couponError && <Text style={styles.couponErrorText}>{couponError}</Text>}
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
          accessibilityLabel={`Pagar ${totalFinal.toFixed(2)} €`}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.payBtnText}>💳 Pagar {totalFinal.toFixed(2)} €</Text>
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
  discount,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  discount?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text
        style={[
          styles.rowValue,
          highlight && styles.rowValueHighlight,
          discount && styles.rowValueDiscount,
        ]}
      >
        {value}
      </Text>
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
  rowValueDiscount: { color: '#198754' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 8 },

  couponContainer: {
    marginHorizontal: 16,
    marginTop: 0,
    marginBottom: 8,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 14,
  },
  couponLabel: { fontSize: 13, color: colors.textSecondary, marginBottom: 8, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 1 },
  couponRow: { flexDirection: 'row', gap: 8 },
  couponInput: {
    flex: 1,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
  },
  couponInputDisabled: { backgroundColor: '#f3f4f6', color: colors.textSecondary },
  couponBtn: {
    paddingHorizontal: 16,
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    minWidth: 96,
    alignItems: 'center',
  },
  couponBtnDisabled: { opacity: 0.5 },
  couponBtnRemove: {
    paddingHorizontal: 16,
    justifyContent: 'center',
    backgroundColor: colors.textSecondary,
    borderRadius: 8,
    minWidth: 96,
    alignItems: 'center',
  },
  couponBtnText: { color: colors.white, fontWeight: '600', fontSize: 13 },
  couponSuccess: { color: '#198754', fontSize: 12, marginTop: 6, fontWeight: '500' },
  couponErrorText: { color: colors.error, fontSize: 12, marginTop: 6 },
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
