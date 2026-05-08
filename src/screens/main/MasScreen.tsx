import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../theme/colors';

interface MenuItem {
  icon: string;
  label: string;
  screen: string;
}

const ITEMS: MenuItem[] = [
  { icon: '📰', label: 'Noticias', screen: 'NoticiasTab' },
  { icon: '👥', label: 'Plantilla', screen: 'PlantillaTab' },
  { icon: '🛍️', label: 'Tienda', screen: 'TiendaTab' },
  { icon: '🏅', label: 'Socios', screen: 'SociosTab' },
];

export default function MasScreen() {
  const navigation = useNavigation<any>();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Más</Text>
        <Text style={styles.headerSub}>Algeciras C.F.</Text>
      </View>
      <ScrollView contentContainerStyle={styles.container}>
        {ITEMS.map((item) => (
          <TouchableOpacity
            key={item.screen}
            style={styles.row}
            onPress={() => navigation.navigate(item.screen)}
            activeOpacity={0.75}
          >
            <Text style={styles.rowIcon}>{item.icon}</Text>
            <Text style={styles.rowLabel}>{item.label}</Text>
            <Text style={styles.rowArrow}>›</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { padding: 16, backgroundColor: colors.primary },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  headerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 2 },
  container: { padding: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  rowIcon: { fontSize: 24, marginRight: 14 },
  rowLabel: { flex: 1, fontSize: 16, fontWeight: '600', color: colors.text },
  rowArrow: { fontSize: 22, color: colors.textSecondary },
});
