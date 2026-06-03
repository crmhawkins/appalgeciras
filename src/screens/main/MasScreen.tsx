import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../theme/colors';

interface MenuItem {
  icon: string;
  label: string;
  screen: string;
  params?: any;
  section?: string;
}

const ITEMS: MenuItem[] = [
  // --- Contenido del club ---
  { icon: '🔍', label: 'Buscar',           screen: 'Busqueda',     section: 'EXPLORAR' },
  { icon: '📰', label: 'Noticias',         screen: 'NoticiasTab',  section: 'EXPLORAR' },
  { icon: '⚽', label: 'Partidos',          screen: 'Partidos',     section: 'EXPLORAR' },
  { icon: '👥', label: 'Plantilla',        screen: 'PlantillaTab', section: 'EXPLORAR' },

  // --- Compra ---
  { icon: '🎟️', label: 'Comprar Entrada',  screen: 'EstadioPlano', section: 'COMPRA' },
  { icon: '🛍️', label: 'Tienda',           screen: 'TiendaTab',    section: 'COMPRA' },
  { icon: '🏅', label: 'Socios',           screen: 'SociosTab',    section: 'COMPRA' },

  // --- Información (WebView a la web Laravel con ?native=1) ---
  { icon: '🏟️', label: 'Estadio Nuevo Mirador', screen: 'Estadio', section: 'INFORMACIÓN' },
  { icon: '🛡️', label: 'El Club',          screen: 'WebPage',
    params: { path: '/club',       title: 'El Club' },        section: 'INFORMACIÓN' },
  { icon: '✉️', label: 'Contacto',         screen: 'WebPage',
    params: { path: '/contacto',   title: 'Contacto' },       section: 'INFORMACIÓN' },
  { icon: '🔒', label: 'Privacidad',       screen: 'WebPage',
    params: { path: '/privacidad', title: 'Privacidad' },     section: 'INFORMACIÓN' },
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
        {ITEMS.map((item, idx) => {
          // Cabecera de sección — sólo cuando cambia respecto al anterior.
          const prev = idx > 0 ? ITEMS[idx - 1] : null;
          const showSection = item.section && (!prev || prev.section !== item.section);
          // Clave única: el screen puede repetirse (WebPage usado 3 veces).
          const key = `${item.screen}-${item.label}`;
          return (
            <React.Fragment key={key}>
              {showSection && (
                <Text style={styles.sectionTitle}>{item.section}</Text>
              )}
              <TouchableOpacity
                style={styles.row}
                onPress={() => navigation.navigate(item.screen, item.params)}
                activeOpacity={0.75}
              >
                <Text style={styles.rowIcon}>{item.icon}</Text>
                <Text style={styles.rowLabel}>{item.label}</Text>
                <Text style={styles.rowArrow}>›</Text>
              </TouchableOpacity>
            </React.Fragment>
          );
        })}
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
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.textSecondary,
    letterSpacing: 1.2,
    marginTop: 10,
    marginBottom: 8,
    paddingLeft: 4,
  },
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
