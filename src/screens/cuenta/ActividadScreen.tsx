import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../theme/colors';

export default function ActividadScreen() {
  const nav = useNavigation<any>();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()}><Text style={styles.back}>‹</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>Mi Actividad</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Votos MVP recientes</Text>
          <Text style={styles.dim}>Aún no has votado en ningún partido.</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Asistencias</Text>
          <Text style={styles.dim}>El historial de partidos a los que has asistido aparecerá aquí.</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Logros</Text>
          <Text style={styles.dim}>Próximamente: medallas por asistencia, jugador favorito, etc.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 12,
  },
  back: { color: colors.white, fontSize: 28, fontWeight: '800', width: 32 },
  headerTitle: { color: colors.white, fontSize: 18, fontWeight: '800' },
  content: { padding: 16 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
  },
  cardTitle: { fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: 6 },
  dim: { color: colors.textSecondary, fontSize: 13, lineHeight: 18 },
});
