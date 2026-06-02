import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useKeepAwake } from 'expo-keep-awake';
import { colors } from '../theme/colors';

export interface QrTicketModalProps {
  visible: boolean;
  onClose: () => void;
  qrSource: string;          // data URI o URL
  title: string;
  subtitle: string;
  footer?: React.ReactNode;
  loading?: boolean;
  error?: string | null;
}

/**
 * Modal full-screen con QR grande pensado para mostrar en el acceso al estadio.
 * - Fondo semi-transparente oscuro para máximo contraste del QR
 * - QR sobre tarjeta blanca con padding (zona quieta requerida por lectores)
 * - useKeepAwake() para que la pantalla no se apague mientras está abierto
 */
function QrTicketModalInner({
  onClose,
  qrSource,
  title,
  subtitle,
  footer,
  loading,
  error,
}: Omit<QrTicketModalProps, 'visible'>) {
  useKeepAwake();
  const { width, height } = Dimensions.get('window');
  // QR ocupa el ~60% del lado más corto para evitar overflow en horizontal.
  const qrSize = Math.round(Math.min(width, height) * 0.6);

  return (
    <View style={styles.overlay}>
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={onClose}
          hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
        >
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={2}>{title}</Text>
        {!!subtitle && <Text style={styles.subtitle} numberOfLines={2}>{subtitle}</Text>}
      </View>

      <View style={styles.qrCard}>
        {loading ? (
          <View style={[styles.qrPlaceholder, { width: qrSize, height: qrSize }]}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : error ? (
          <View style={[styles.qrPlaceholder, { width: qrSize, height: qrSize }]}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <Image
            source={{ uri: qrSource }}
            style={{ width: qrSize, height: qrSize }}
            resizeMode="contain"
          />
        )}
      </View>

      {footer && <View style={styles.footer}>{footer}</View>}
    </View>
  );
}

export default function QrTicketModal(props: QrTicketModalProps) {
  return (
    <Modal
      visible={props.visible}
      transparent
      animationType="fade"
      onRequestClose={props.onClose}
      statusBarTranslucent
    >
      {/* useKeepAwake() solo debe vivir mientras el modal está visible */}
      {props.visible && <QrTicketModalInner {...props} />}
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 24,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    lineHeight: 22,
  },
  header: {
    alignItems: 'center',
    marginBottom: 18,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  qrCard: {
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 16,
    alignSelf: 'center',
    marginBottom: 18,
  },
  qrPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: colors.primary,
    textAlign: 'center',
    paddingHorizontal: 12,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
});
