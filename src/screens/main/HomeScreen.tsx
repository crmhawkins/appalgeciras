import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { ClasificacionItem } from '../../types';

export default function HomeScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const [clasificacion, setClasificacion] = useState<ClasificacionItem[]>([]);
  const [loadingClasif, setLoadingClasif] = useState(true);

  const loadClasificacion = useCallback(async () => {
    try {
      const { data } = await api.get<ClasificacionItem[]>('/api/clasificacion');
      setClasificacion(data ?? []);
    } catch (_) {}
    finally { setLoadingClasif(false); }
  }, []);

  useEffect(() => { loadClasificacion(); }, [loadClasificacion]);

  const goAbonos = () => navigation.navigate('AbonosTab');
  const goPartidos = () => navigation.navigate('PartidosTab');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View style={styles.escudoPlaceholder}>
            <Text style={styles.escudoText}>ACF</Text>
          </View>
          <View>
            <Text style={styles.clubName}>Algeciras CF</Text>
            <Text style={styles.welcome}>
              {user ? `Hola, ${user.nombre || user.email}` : 'Bienvenido, aficionado'}
            </Text>
          </View>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={goAbonos}>
            <Text style={styles.actionIcon}>🎟️</Text>
            <Text style={styles.actionLabel}>Comprar Abono</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnSecondary]} onPress={goPartidos}>
            <Text style={styles.actionIcon}>⚽</Text>
            <Text style={[styles.actionLabel, styles.actionLabelSecondary]}>Ver Partidos</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Clasificación</Text>
          {loadingClasif ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 12 }} />
          ) : clasificacion.length === 0 ? (
            <Text style={styles.emptyText}>Sin datos de clasificación</Text>
          ) : (
            <View style={styles.table}>
              <View style={[styles.tableRow, styles.tableHeader]}>
                <Text style={[styles.cell, styles.cellPos, styles.headerCell]}>#</Text>
                <Text style={[styles.cellEquipo, styles.headerCell]}>Equipo</Text>
                <Text style={[styles.cell, styles.headerCell]}>PJ</Text>
                <Text style={[styles.cell, styles.headerCell]}>GF</Text>
                <Text style={[styles.cell, styles.headerCell]}>GC</Text>
                <Text style={[styles.cell, styles.cellPts, styles.headerCell]}>Pts</Text>
              </View>
              {clasificacion.slice(0, 10).map((item) => {
                const isAlgeciras = item.equipo?.toLowerCase().includes('algeciras');
                return (
                  <View
                    key={item.id}
                    style={[styles.tableRow, isAlgeciras && styles.highlightRow]}
                  >
                    <Text style={[styles.cell, styles.cellPos, isAlgeciras && styles.highlightText]}>
                      {item.posicion}
                    </Text>
                    <View style={styles.equipoCell}>
                      {item.escudo ? (
                        <Image source={{ uri: item.escudo }} style={styles.escudoSmall} />
                      ) : null}
                      <Text
                        style={[styles.cellEquipoText, isAlgeciras && styles.highlightText]}
                        numberOfLines={1}
                      >
                        {item.equipo}
                      </Text>
                    </View>
                    <Text style={[styles.cell, isAlgeciras && styles.highlightText]}>{item.pj}</Text>
                    <Text style={[styles.cell, isAlgeciras && styles.highlightText]}>{item.gf}</Text>
                    <Text style={[styles.cell, isAlgeciras && styles.highlightText]}>{item.gc}</Text>
                    <Text style={[styles.cell, styles.cellPts, styles.ptsText, isAlgeciras && styles.highlightPts]}>
                      {item.puntos}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: 16 },
  header: {
    backgroundColor: colors.primary,
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  escudoPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.secondary,
  },
  escudoText: { color: colors.secondary, fontWeight: 'bold', fontSize: 14 },
  clubName: { color: colors.white, fontSize: 20, fontWeight: 'bold' },
  welcome: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 2 },
  actionsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  actionBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionBtnSecondary: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  actionIcon: { fontSize: 24, marginBottom: 4 },
  actionLabel: { color: colors.white, fontWeight: 'bold', fontSize: 13 },
  actionLabelSecondary: { color: colors.primary },
  section: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: colors.secondary,
    paddingLeft: 8,
  },
  emptyText: { color: colors.textSecondary, textAlign: 'center', paddingVertical: 12 },
  table: { borderRadius: 8, overflow: 'hidden' },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tableHeader: { backgroundColor: colors.primary, borderBottomWidth: 0 },
  highlightRow: { backgroundColor: '#e8f5ee' },
  cell: { width: 30, textAlign: 'center', fontSize: 13, color: colors.text },
  cellPos: { width: 26 },
  cellPts: { width: 34, fontWeight: 'bold' },
  cellEquipo: { flex: 1, fontSize: 13, fontWeight: 'bold', color: colors.white, paddingLeft: 4 },
  cellEquipoText: { flex: 1, fontSize: 13, color: colors.text },
  headerCell: { color: colors.white, fontWeight: 'bold', fontSize: 12 },
  ptsText: { color: colors.primary, fontWeight: 'bold' },
  highlightText: { fontWeight: 'bold', color: colors.primary },
  highlightPts: { color: colors.primary, fontWeight: 'bold' },
  equipoCell: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingLeft: 4, gap: 4 },
  escudoSmall: { width: 18, height: 18, resizeMode: 'contain' },
});
