import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../../theme/colors';

const STORAGE_KEY = 'notif_prefs';

interface Prefs {
  goles: boolean;
  alineaciones: boolean;
  noticias: boolean;
  ofertas_tienda: boolean;
  fanzone: boolean;
  recordatorio_partido: boolean;
}

const DEFAULT_PREFS: Prefs = {
  goles: true,
  alineaciones: true,
  noticias: true,
  ofertas_tienda: false,
  fanzone: true,
  recordatorio_partido: true,
};

const ITEMS: { key: keyof Prefs; icon: string; label: string; desc: string }[] = [
  { key: 'goles',                icon: '⚽', label: 'Goles',                desc: 'Avisos en tiempo real cuando marca el Algeciras.' },
  { key: 'alineaciones',         icon: '📋', label: 'Alineaciones',         desc: 'Once oficial al confirmarse antes del partido.' },
  { key: 'recordatorio_partido', icon: '⏰', label: 'Recordatorio partido', desc: 'Aviso 1 hora antes de cada partido.' },
  { key: 'noticias',             icon: '📰', label: 'Noticias',             desc: 'Fichajes, comunicados y notas de prensa.' },
  { key: 'fanzone',              icon: '⭐', label: 'Fan Zone',              desc: 'Concursos, sorteos y eventos para abonados.' },
  { key: 'ofertas_tienda',       icon: '🛒', label: 'Ofertas tienda',       desc: 'Descuentos en camisetas y merchandising.' },
];

export default function NotificacionesScreen() {
  const nav = useNavigation<any>();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(raw) });
      } catch { /* noop */ }
      finally { setLoading(false); }
    })();
  }, []);

  const toggle = async (k: keyof Prefs) => {
    const next = { ...prefs, [k]: !prefs[k] };
    setPrefs(next);
    try { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* noop */ }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()}><Text style={styles.back}>‹</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>Notificaciones</Text>
        <View style={{ width: 32 }} />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.intro}>
            Elige qué avisos quieres recibir. Estos ajustes se guardan en tu dispositivo.
          </Text>
          <View style={styles.list}>
            {ITEMS.map((it, idx) => (
              <View
                key={it.key}
                style={[styles.row, idx === ITEMS.length - 1 && { borderBottomWidth: 0 }]}
              >
                <Text style={styles.icon}>{it.icon}</Text>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={styles.label}>{it.label}</Text>
                  <Text style={styles.desc}>{it.desc}</Text>
                </View>
                <Switch
                  value={prefs[it.key]}
                  onValueChange={() => toggle(it.key)}
                  trackColor={{ false: '#ccc', true: colors.primary }}
                  thumbColor={'#fff'}
                />
              </View>
            ))}
          </View>
        </ScrollView>
      )}
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16 },
  intro: { fontSize: 13, color: colors.textSecondary, marginBottom: 14, lineHeight: 18 },
  list: {
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: 14,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  icon: { fontSize: 22, marginRight: 12 },
  label: { fontSize: 14, fontWeight: '800', color: colors.text },
  desc: { fontSize: 12, color: colors.textSecondary, marginTop: 2, lineHeight: 16 },
});
