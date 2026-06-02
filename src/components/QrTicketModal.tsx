import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  FlatList,
  Pressable,
} from 'react-native';
import { useKeepAwake } from 'expo-keep-awake';
import { colors } from '../theme/colors';

export interface QrTicketMatchOption {
  id: number;
  label: string;
  kickoff_at: string;
}

export interface QrTicketModalProps {
  visible: boolean;
  onClose: () => void;
  qrSource: string;          // data URI o URL
  title: string;
  subtitle: string;
  footer?: React.ReactNode;
  loading?: boolean;
  error?: string | null;
  /** Lista de partidos seleccionables (alternativos al actual). Opcional. */
  matchOptions?: QrTicketMatchOption[];
  /** ID del partido actualmente seleccionado dentro de matchOptions. */
  selectedMatchId?: number;
  /** Callback al seleccionar un partido distinto. */
  onMatchChange?: (id: number) => void;
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
  matchOptions,
  selectedMatchId,
  onMatchChange,
}: Omit<QrTicketModalProps, 'visible'>) {
  useKeepAwake();
  const { width, height } = Dimensions.get('window');
  // QR ocupa el ~60% del lado más corto para evitar overflow en horizontal.
  const qrSize = Math.round(Math.min(width, height) * 0.6);

  const [pickerOpen, setPickerOpen] = useState(false);
  const hasSelector = !!matchOptions && matchOptions.length > 0 && !!onMatchChange;
  const selectedOption = hasSelector
    ? matchOptions!.find((m) => m.id === selectedMatchId) ?? matchOptions![0]
    : null;

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

      {hasSelector && selectedOption && (
        <Pressable
          style={styles.selector}
          onPress={() => setPickerOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Cambiar de partido"
        >
          <Text style={styles.selectorLabel}>Partido</Text>
          <Text style={styles.selectorValue} numberOfLines={1}>
            {selectedOption.label}  ▾
          </Text>
        </Pressable>
      )}

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

      {hasSelector && (
        <Modal
          visible={pickerOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setPickerOpen(false)}
        >
          <Pressable style={styles.pickerBackdrop} onPress={() => setPickerOpen(false)}>
            <Pressable style={styles.pickerCard} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.pickerTitle}>Elige partido</Text>
              <FlatList
                data={matchOptions!}
                keyExtractor={(m) => String(m.id)}
                renderItem={({ item }) => {
                  const isSelected = item.id === selectedOption?.id;
                  return (
                    <TouchableOpacity
                      style={[styles.pickerRow, isSelected && styles.pickerRowSelected]}
                      onPress={() => {
                        setPickerOpen(false);
                        if (!isSelected) onMatchChange!(item.id);
                      }}
                    >
                      <Text style={[styles.pickerRowText, isSelected && styles.pickerRowTextSelected]}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                }}
                ItemSeparatorComponent={() => <View style={styles.pickerSep} />}
              />
              <TouchableOpacity style={styles.pickerCancel} onPress={() => setPickerOpen(false)}>
                <Text style={styles.pickerCancelText}>Cancelar</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>
      )}
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
  selector: {
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderColor: 'rgba(255,255,255,0.30)',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  selectorLabel: {
    color: 'rgba(255,255,255,0.70)',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  selectorValue: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 2,
  },
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  pickerCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 16,
    width: '100%',
    maxHeight: '70%',
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  pickerRow: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  pickerRowSelected: {
    backgroundColor: 'rgba(207,46,46,0.08)',
  },
  pickerRowText: {
    fontSize: 14,
    color: colors.text,
  },
  pickerRowTextSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  pickerSep: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  pickerCancel: {
    marginTop: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  pickerCancelText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
});
