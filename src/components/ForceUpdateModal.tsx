import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  BackHandler,
  Platform,
  StatusBar,
} from 'react-native';
import { colors } from '../theme/colors';

export interface ForceUpdateModalProps {
  /** Si true, el modal NO puede cerrarse (versión por debajo del mínimo) */
  forced: boolean;
  /** URL de la store que abrirá el botón "Actualizar ahora" */
  storeUrl: string;
  /** Versión recomendada — se muestra en el cuerpo del mensaje */
  latest?: string;
  /** Notas de la release que se mostrarán bajo el mensaje */
  releaseNotes?: string;
  /** Callback que se invoca al pulsar "Más tarde" en modo recommended */
  onDismiss?: () => void;
}

/**
 * Modal de actualización obligatoria / recomendada.
 *
 * - Si `forced=true`: full-screen bloqueante, sin botón "Más tarde", el
 *   back de Android queda capturado (BackHandler devuelve true).
 * - Si `forced=false`: modal habitual con "Más tarde" + "Actualizar".
 */
export default function ForceUpdateModal({
  forced,
  storeUrl,
  latest,
  releaseNotes,
  onDismiss,
}: ForceUpdateModalProps) {
  // Capturar back de Android cuando el update es obligatorio.
  React.useEffect(() => {
    if (!forced) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, [forced]);

  const handleOpenStore = React.useCallback(() => {
    Linking.openURL(storeUrl).catch(() => {});
  }, [storeUrl]);

  const title = forced ? 'Actualización necesaria' : 'Nueva versión disponible';
  const body = forced
    ? 'Para seguir usando la app del Algeciras CF necesitas actualizar a la última versión.'
    : `Hay una nueva versión de la app${latest ? ` (${latest})` : ''} con mejoras y correcciones. Te recomendamos actualizar.`;

  return (
    <Modal
      visible
      transparent={!forced}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {
        // En Android, onRequestClose se llama con el botón atrás.
        if (forced) return;
        onDismiss?.();
      }}
    >
      {forced && Platform.OS === 'android' ? (
        <StatusBar backgroundColor={colors.primary} barStyle="light-content" />
      ) : null}

      <View
        style={[
          styles.backdrop,
          forced ? styles.backdropForced : styles.backdropSoft,
        ]}
      >
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>

          {releaseNotes ? (
            <Text style={styles.notes}>{releaseNotes}</Text>
          ) : null}

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleOpenStore}
            accessibilityRole="button"
            accessibilityLabel="Actualizar ahora"
          >
            <Text style={styles.primaryBtnText}>Actualizar ahora</Text>
          </TouchableOpacity>

          {!forced ? (
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={onDismiss}
              accessibilityRole="button"
              accessibilityLabel="Más tarde"
            >
              <Text style={styles.secondaryBtnText}>Más tarde</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  backdropForced: {
    backgroundColor: colors.white,
  },
  backdropSoft: {
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 24,
    shadowColor: colors.black,
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 12,
    textAlign: 'center',
  },
  body: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 12,
  },
  notes: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 16,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryBtnText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  secondaryBtnText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '500',
  },
});
