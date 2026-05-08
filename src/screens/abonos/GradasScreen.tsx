import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import api from '../../services/api';
import { colors } from '../../theme/colors';
import { Grada } from '../../types';
import MapaEstadio from '../../components/MapaEstadio';

export default function GradasScreen() {
  const navigation = useNavigation<any>();
  const [gradas, setGradas] = useState<Grada[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gradaSeleccionada, setGradaSeleccionada] = useState<string | null>(null);

  const loadGradas = useCallback(async () => {
    setError(null);
    try {
      const { data } = await api.get<{ gradas: Grada[] }>('/api/gradas');
      setGradas(data.gradas ?? []);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Error cargando gradas');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadGradas();
  }, [loadGradas]);

  const onRefresh = () => {
    setRefreshing(true);
    loadGradas();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Elige tu Zona</Text>
        <Text style={styles.headerSub}>Paso 1 de 3 · Estadio El Mirador</Text>
      </View>
      <View style={styles.infoBanner}>
        <Text style={styles.infoBannerText}>🎟️ Selecciona la zona del estadio para ver los sectores disponibles</Text>
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
      <FlatList
        data={gradas}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <View style={styles.mapaContainer}>
            <MapaEstadio gradaActiva={gradaSeleccionada ?? undefined} />
            {gradaSeleccionada && (
              <Text style={styles.mapaHint}>
                Zona destacada: <Text style={styles.mapaHintBold}>{gradaSeleccionada}</Text>
              </Text>
            )}
            {!gradaSeleccionada && (
              <Text style={styles.mapaHint}>Toca una grada para ver su ubicación</Text>
            )}
          </View>
        }
        ListEmptyComponent={
          !error ? <Text style={styles.empty}>No hay gradas disponibles</Text> : null
        }
        renderItem={({ item }) => {
          const isSelected = gradaSeleccionada === item.nombre;
          return (
            <TouchableOpacity
              style={[styles.card, isSelected && styles.cardSelected]}
              onPress={() => {
                setGradaSeleccionada(item.nombre);
                navigation.navigate('Sectores', {
                  gradaId: item.id,
                  gradaNombre: item.nombre,
                });
              }}
              accessibilityLabel={`Seleccionar zona ${item.nombre}`}
            >
              <View style={[styles.imagePlaceholder, isSelected && styles.imagePlaceholderSelected]}>
                <Text style={styles.imagePlaceholderText}>
                  {item.nombre?.charAt(0)?.toUpperCase() ?? 'G'}
                </Text>
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{item.nombre}</Text>
                {item.descripcion ? (
                  <Text style={styles.cardText} numberOfLines={2}>
                    {item.descripcion}
                  </Text>
                ) : null}
              </View>
              <Text style={styles.cardArrow}>›</Text>
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 16, backgroundColor: colors.primary },
  headerTitle: { color: colors.white, fontSize: 20, fontWeight: 'bold' },
  headerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },
  infoBanner: { backgroundColor: '#fff3cd', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#ffc107' },
  infoBannerText: { fontSize: 13, color: '#856404', textAlign: 'center' },
  list: { padding: 16 },
  mapaContainer: {
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#1a1a2e',
  },
  mapaHint: {
    textAlign: 'center',
    color: '#aaaacc',
    fontSize: 12,
    paddingVertical: 6,
    backgroundColor: '#1a1a2e',
  },
  mapaHintBold: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardSelected: {
    borderColor: colors.primary,
  },
  imagePlaceholder: {
    width: 90,
    height: 90,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderSelected: {
    backgroundColor: '#8a0b1f',
  },
  imagePlaceholderText: {
    color: colors.white,
    fontSize: 32,
    fontWeight: 'bold',
  },
  cardBody: { flex: 1, padding: 12, justifyContent: 'center' },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text },
  cardText: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  cardArrow: { fontSize: 24, color: colors.primary, paddingHorizontal: 8, alignSelf: 'center' },
  empty: { textAlign: 'center', color: colors.textSecondary, marginTop: 24 },
  error: { color: colors.error, textAlign: 'center', marginTop: 12 },
});
