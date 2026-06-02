/**
 * ComprarHomeScreen — primer paso de la pestaña "Comprar" del bottom tab.
 *
 * Hasta el 2026-06-02 la pestaña entraba directamente a Gradas (selección
 * de zona para abono). El usuario reportó que debería preguntar primero
 * QUÉ quiere comprar — un abono (de temporada) o una entrada (puntual de
 * un partido). Este selector aparece como pantalla inicial del stack y al
 * pulsar la card navega al sub-flujo correspondiente.
 */
import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import { ESCUDO_URL } from '../../constants';

export default function ComprarHomeScreen() {
  const navigation = useNavigation<any>();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Image source={{ uri: ESCUDO_URL }} style={styles.escudo} resizeMode="contain" />
        <Text style={styles.title}>¿Qué quieres comprar?</Text>
        <Text style={styles.subtitle}>
          Elige una opción para continuar
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.cards}>
        <TouchableOpacity
          style={[styles.card, styles.cardAbono]}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Gradas')}
          accessibilityLabel="Comprar abono de temporada"
        >
          <Text style={styles.cardEmoji}>🎟️</Text>
          <Text style={styles.cardTitle}>Abono</Text>
          <Text style={styles.cardSubtitle}>
            Tu sitio en el Mirador para los 19 partidos de Primera RFEF
          </Text>
          <View style={styles.cardCta}>
            <Text style={styles.cardCtaText}>Elegir abono →</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.card, styles.cardEntrada]}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Entradas')}
          accessibilityLabel="Comprar entrada de un partido"
        >
          <Text style={styles.cardEmoji}>🎫</Text>
          <Text style={styles.cardTitle}>Entrada</Text>
          <Text style={styles.cardSubtitle}>
            Entrada puntual para un partido concreto
          </Text>
          <View style={styles.cardCta}>
            <Text style={styles.cardCtaText}>Elegir partido →</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.note}>
          <Text style={styles.noteText}>
            ℹ️  Si ya eres abonado, no necesitas comprar entrada para los partidos
            de Liga — tu abono te da acceso.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.primary,
    padding: 24,
    alignItems: 'center',
  },
  escudo: { width: 64, height: 64, marginBottom: 12 },
  title: { color: colors.white, fontSize: 28, fontWeight: '900', textAlign: 'center', letterSpacing: 0.5 },
  subtitle: { color: 'rgba(255,255,255,0.85)', marginTop: 6, textAlign: 'center', fontSize: 14 },

  cards: { padding: 16, gap: 14 },

  card: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 22,
    marginBottom: 14,
    borderLeftWidth: 6,
    borderLeftColor: colors.primary,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardAbono:   { borderLeftColor: colors.primary },
  cardEntrada: { borderLeftColor: '#0F172A' },

  cardEmoji: { fontSize: 36, marginBottom: 8 },
  cardTitle: { fontSize: 24, fontWeight: '800', color: colors.text, marginBottom: 4 },
  cardSubtitle: { fontSize: 14, color: colors.textSecondary, marginBottom: 16, lineHeight: 20 },
  cardCta: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.primary,
    borderRadius: 6,
  },
  cardCtaText: { color: colors.white, fontWeight: '700', fontSize: 13, letterSpacing: 0.5 },

  note: {
    backgroundColor: '#FFF8E1',
    borderRadius: 10,
    padding: 14,
    marginTop: 4,
  },
  noteText: { color: '#92400E', fontSize: 13, lineHeight: 18 },
});
