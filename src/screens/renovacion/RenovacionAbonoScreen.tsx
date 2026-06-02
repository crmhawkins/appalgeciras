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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as WebBrowser from 'expo-web-browser';
import * as Haptics from 'expo-haptics';
import api from '../../services/api';
import { clearCached } from '../../services/cache';
import { getToken } from '../../services/auth';
import { colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { MainStackParamList } from '../../navigation/MainStack';
import { ESCUDO_URL, TEMPORADA_CORTA, COMPETICION, ESTADIO } from '../../constants';

interface AbonadoData {
  numero_abonado: number;
  nombre?: string | null;
  apellidos?: string | null;
  email?: string | null;
  telefono?: string | null;
  sector_nombre?: string | null;
  fila?: string | number | null;
  asiento?: string | number | null;
  season_name?: string | null;
  precio_renovacion: number;
  gastos_gestion?: number;
  total_renovacion?: number;
  renovacion_season?: string | null;
  renovacion_product_id?: number | null;
}

interface LookupResp {
  found: boolean;
  message?: string;
  abonado?: AbonadoData;
}

interface RenovarResp {
  orderReference: string;
  checkoutUrl: string;
}

interface SyncResp {
  status: 'paid' | 'pending' | 'failed' | string;
  reference: string;
}

/**
 * Renovación de abono.
 *
 *   1. El abonado introduce su Número de Abonado + DNI.
 *   2. POST /api/abonados/lookup → ficha con sus datos + precio renovación.
 *   3. POST /api/abonados/renovar → URL checkout web.
 *   4. WebBrowser.openBrowserAsync(url) → al cerrar, /api/checkout/sync.
 *
 * Mismo flujo y estilo que CheckoutScreen para que el usuario reconozca el
 * patrón visual (cabecera roja + clubCard + tarjetas blancas + botón rojo).
 */
export default function RenovacionAbonoScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { user } = useAuth();

  // Form state
  const [numeroAbonado, setNumeroAbonado] = useState('');
  const [dni, setDni] = useState(user?.dni || '');
  const [searching, setSearching] = useState(false);
  const [errorBusqueda, setErrorBusqueda] = useState<string | null>(null);

  // Resultado del lookup
  const [abonado, setAbonado] = useState<AbonadoData | null>(null);

  // Renovación
  const [paying, setPaying] = useState(false);

  // Cupón descuento
  const [couponCode, setCouponCode] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);

  const handleApplyCoupon = async () => {
    if (!abonado) return;
    const code = couponCode.trim().toUpperCase();
    if (!code) {
      setCouponError('Introduce un código');
      return;
    }
    setCouponLoading(true);
    setCouponError(null);
    try {
      const subtotalBase = Number(abonado.precio_renovacion) || 0;
      const { data } = await api.post<{
        valid: boolean;
        discount_amount?: number;
        message?: string;
      }>('/api/checkout/coupon/preview', {
        code,
        subtotal: subtotalBase,
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
      setCouponError(
        e?.response?.data?.message || 'No se pudo validar el cupón',
      );
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

  const handleBuscar = async () => {
    setErrorBusqueda(null);
    const num = numeroAbonado.trim();
    const dniClean = dni.trim();

    if (!num) {
      setErrorBusqueda('Introduce tu número de abonado');
      return;
    }
    if (!/^\d+$/.test(num)) {
      setErrorBusqueda('El número de abonado debe ser numérico');
      return;
    }
    if (!dniClean) {
      setErrorBusqueda('Introduce tu DNI');
      return;
    }

    setSearching(true);
    setAbonado(null);
    try {
      const { data } = await api.post<LookupResp>('/api/abonados/lookup', {
        numero_abonado: parseInt(num, 10),
        dni: dniClean,
      });

      if (!data?.found || !data.abonado) {
        setErrorBusqueda(data?.message || 'No encontramos un abono con esos datos');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        return;
      }

      setAbonado(data.abonado);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.msg ||
        e?.message ||
        'Error buscando el abono';
      setErrorBusqueda(msg);
    } finally {
      setSearching(false);
    }
  };

  const handleRenovar = async () => {
    if (!abonado) return;
    if (!abonado.renovacion_product_id) {
      Alert.alert(
        'Renovación no disponible',
        'No hay un producto de abono activo para la nueva temporada. Contacta con el club.',
      );
      return;
    }

    setPaying(true);
    try {
      const token = await getToken();
      const { data } = await api.post<RenovarResp>('/api/abonados/renovar', {
        numero_abonado: abonado.numero_abonado,
        dni: dni.trim(),
        items: [
          { product_id: abonado.renovacion_product_id, qty: 1 },
        ],
        coupon_code: couponApplied ? couponCode : undefined,
      });

      if (!data?.checkoutUrl) {
        Alert.alert(
          'Pasarela en montaje',
          'El cobro online estará disponible en breve. Contacta con el club.',
        );
        return;
      }

      const url =
        data.checkoutUrl +
        (data.checkoutUrl.includes('?') ? '&' : '?') +
        `native=1&token=${encodeURIComponent(token || '')}`;

      await WebBrowser.openBrowserAsync(url, {
        dismissButtonStyle: 'cancel',
        readerMode: false,
        toolbarColor: colors.primary,
      });

      try {
        const { data: sync } = await api.post<SyncResp>('/api/checkout/sync', {
          orderReference: data.orderReference,
        });
        if (sync.status === 'paid') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          if (user?.id) {
            await clearCached('socios_abonos_' + user.id);
            await clearCached('perfil_abonos_' + user.id);
          }
          Alert.alert(
            '¡Renovación completada!',
            `Pedido ${sync.reference}. Recibirás tu nuevo abono por email con el QR.`,
            [{ text: 'OK', onPress: () => navigation.goBack() }],
          );
        } else if (sync.status === 'pending') {
          Alert.alert(
            'Pago en proceso',
            'Estamos confirmando con el banco. Recibirás email cuando termine.',
          );
        } else {
          Alert.alert(
            'Pago no completado',
            'Si cerraste antes de pagar puedes intentarlo de nuevo.',
          );
        }
      } catch {
        Alert.alert(
          'Pago',
          'Si completaste el pago, recibirás email con tu abono. Si no, vuelve a intentarlo.',
        );
      }
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.msg ||
        e?.message ||
        'No se pudo iniciar la renovación';
      Alert.alert('Error', msg);
    } finally {
      setPaying(false);
    }
  };

  const handleNuevaBusqueda = () => {
    setAbonado(null);
    setErrorBusqueda(null);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Renovación de abono</Text>
        <Text style={styles.headerSub}>
          Temporada {TEMPORADA_CORTA} · {COMPETICION.split(' · ')[0]}
        </Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1 }}
        >
          <View style={styles.clubCard}>
            <Image
              source={{ uri: ESCUDO_URL }}
              style={styles.clubEscudo}
              resizeMode="contain"
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.clubName}>Algeciras Club de Fútbol</Text>
              <Text style={styles.clubInfo}>{ESTADIO}</Text>
              <Text style={styles.clubInfo}>{COMPETICION}</Text>
            </View>
          </View>

          {!abonado ? (
            /* FORMULARIO DE BÚSQUEDA */
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Introduce tus datos</Text>
              <Text style={styles.cardHelp}>
                Localizaremos tu abono actual y te ofreceremos su renovación
                para la nueva temporada.
              </Text>

              <Text style={styles.inputLabel}>Número de abonado</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej. 4521"
                keyboardType="number-pad"
                value={numeroAbonado}
                onChangeText={(t) => {
                  setNumeroAbonado(t.replace(/\D/g, ''));
                  if (errorBusqueda) setErrorBusqueda(null);
                }}
                autoFocus
                returnKeyType="next"
              />

              <Text style={[styles.inputLabel, { marginTop: 14 }]}>DNI</Text>
              <TextInput
                style={styles.input}
                placeholder="12345678Z"
                autoCapitalize="characters"
                value={dni}
                onChangeText={(t) => {
                  setDni(t);
                  if (errorBusqueda) setErrorBusqueda(null);
                }}
                returnKeyType="search"
                onSubmitEditing={handleBuscar}
              />

              {errorBusqueda && (
                <Text style={styles.errorText}>{errorBusqueda}</Text>
              )}

              <TouchableOpacity
                style={[styles.primaryBtn, searching && styles.btnDisabled]}
                onPress={handleBuscar}
                disabled={searching}
                accessibilityLabel="Buscar abono"
              >
                {searching ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.primaryBtnText}>🔍 Buscar abono</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            /* FICHA DEL ABONADO */
            <>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Tu abono actual</Text>

                <Row label="Nº de abonado" value={String(abonado.numero_abonado)} />
                <Row
                  label="Titular"
                  value={`${abonado.nombre ?? ''} ${abonado.apellidos ?? ''}`.trim() || '—'}
                />
                {abonado.email && <Row label="Email" value={abonado.email} />}
                {abonado.sector_nombre && (
                  <Row label="Sector" value={abonado.sector_nombre} />
                )}
                {abonado.fila != null && (
                  <Row label="Fila" value={String(abonado.fila)} />
                )}
                {abonado.asiento != null && (
                  <Row label="Asiento" value={String(abonado.asiento)} />
                )}
                {abonado.season_name && (
                  <Row label="Temporada actual" value={abonado.season_name} />
                )}

                <View style={styles.divider} />

                {(() => {
                  const base = Number(abonado.precio_renovacion) || 0;
                  const fee  = abonado.gastos_gestion ?? (Math.floor(base * 0.05 * 100) / 100);
                  const totBruto = abonado.total_renovacion ?? (base + fee);
                  const tot      = Math.max(0, totBruto - couponDiscount);
                  return (
                    <>
                      <Row
                        label={`Subtotal ${abonado.renovacion_season ?? ''}`.trim()}
                        value={`${base.toFixed(2)} €`}
                      />
                      <Row
                        label="Gastos de gestión (5%)"
                        value={`${fee.toFixed(2)} €`}
                      />
                      {couponApplied && couponDiscount > 0 && (
                        <Row
                          label={`Descuento ${couponCode}`}
                          value={`−${couponDiscount.toFixed(2)} €`}
                          discount
                        />
                      )}
                      <View style={styles.divider} />
                      <Row
                        label="Total a pagar"
                        value={`${tot.toFixed(2)} €`}
                        highlight
                      />
                    </>
                  );
                })()}
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

              <View style={styles.footer}>
                <TouchableOpacity
                  style={[styles.primaryBtn, paying && styles.btnDisabled]}
                  onPress={handleRenovar}
                  disabled={paying}
                  accessibilityLabel={`Renovar abono ${Math.max(0, (abonado.total_renovacion ?? abonado.precio_renovacion) - couponDiscount).toFixed(2)} €`}
                >
                  {paying ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <Text style={styles.primaryBtnText}>
                      💳 Renovar abono {Math.max(0, (abonado.total_renovacion ?? abonado.precio_renovacion) - couponDiscount).toFixed(2)} €
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={handleNuevaBusqueda}
                  disabled={paying}
                >
                  <Text style={styles.secondaryBtnText}>Buscar otro abono</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => navigation.goBack()}
                  disabled={paying}
                >
                  <Text style={styles.cancelBtnText}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
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

  clubCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 14,
    gap: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  clubEscudo: { width: 48, height: 48 },
  clubName: { fontSize: 15, fontWeight: 'bold', color: colors.text },
  clubInfo: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },

  card: {
    backgroundColor: colors.white,
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 4,
    borderLeftWidth: 3,
    borderLeftColor: colors.secondary,
    paddingLeft: 8,
  },
  cardHelp: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 12,
    marginTop: 4,
    lineHeight: 16,
  },

  inputLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 6,
    fontWeight: '500',
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.text,
  },
  errorText: { color: colors.error, fontSize: 13, marginTop: 10, fontWeight: '500' },

  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  rowLabel: { color: colors.textSecondary, fontSize: 14, flex: 1 },
  rowValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
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

  footer: { paddingHorizontal: 16, paddingBottom: 16 },
  primaryBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  primaryBtnText: { color: colors.white, fontWeight: 'bold', fontSize: 16 },
  btnDisabled: { opacity: 0.6 },
  secondaryBtn: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  secondaryBtnText: { color: colors.primary, fontWeight: '600' },
  cancelBtn: { paddingVertical: 12, alignItems: 'center', marginTop: 8 },
  cancelBtnText: { color: colors.textSecondary },
});
