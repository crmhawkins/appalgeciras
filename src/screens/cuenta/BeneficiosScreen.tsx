import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../theme/colors';

type Tab = 'disponibles' | 'canjeados';

export default function BeneficiosScreen() {
  const nav = useNavigation<any>();
  const [tab, setTab] = useState<Tab>('disponibles');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()}><Text style={styles.back}>‹</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>Beneficios</Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'disponibles' && styles.tabActive]}
          onPress={() => setTab('disponibles')}
        >
          <Text style={[styles.tabText, tab === 'disponibles' && styles.tabTextActive]}>Disponibles</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'canjeados' && styles.tabActive]}
          onPress={() => setTab('canjeados')}
        >
          <Text style={[styles.tabText, tab === 'canjeados' && styles.tabTextActive]}>Canjeados</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🎁</Text>
          <Text style={styles.emptyTitle}>
            {tab === 'disponibles' ? 'Pronto tendrás cupones exclusivos' : 'Aún no has canjeado nada'}
          </Text>
          <Text style={styles.emptyText}>
            {tab === 'disponibles'
              ? 'Por ser abonado del Algeciras CF recibirás descuentos en la tienda, sorteos y experiencias VIP.'
              : 'Cuando uses un beneficio aparecerá aquí.'}
          </Text>
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
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 3, borderBottomColor: colors.primary },
  tabText: { fontSize: 14, fontWeight: '700', color: colors.textSecondary },
  tabTextActive: { color: colors.primary },
  content: { padding: 24 },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 64, marginBottom: 18 },
  emptyTitle: {
    fontSize: 18, fontWeight: '800', color: colors.text,
    textAlign: 'center', marginBottom: 10,
  },
  emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
});
