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

export default function GradasScreen() {
  const navigation = useNavigation<any>();
  const [gradas, setGradas] = useState<Grada[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        <Text style={styles.headerTitle}>Selecciona Grada</Text>
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
      <FlatList
        data={gradas}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          !error ? <Text style={styles.empty}>No hay gradas disponibles</Text> : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() =>
              navigation.navigate('Sectores', {
                gradaId: item.id,
                gradaNombre: item.nombre,
              })
            }
          >
            <View style={styles.imagePlaceholder}>
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
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 16, backgroundColor: colors.primary },
  headerTitle: { color: colors.white, fontSize: 20, fontWeight: 'bold' },
  list: { padding: 16 },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  imagePlaceholder: {
    width: 90,
    height: 90,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    color: colors.white,
    fontSize: 32,
    fontWeight: 'bold',
  },
  cardBody: { flex: 1, padding: 12, justifyContent: 'center' },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text },
  cardText: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  empty: { textAlign: 'center', color: colors.textSecondary, marginTop: 24 },
  error: { color: colors.error, textAlign: 'center', marginTop: 12 },
});
