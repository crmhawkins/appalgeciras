import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Image, RefreshControl, SectionList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import api from '../../services/api';

interface Jugador {
  id: number;
  nombre: string;
  apellidos?: string;
  dorsal?: number;
  posicion?: string;
  sofascoreId?: number;
  foto?: string;
}

type PosicionGrupo = 'Porteros' | 'Defensas' | 'Centrocampistas' | 'Delanteros' | 'Otros';

const POSICION_ORDEN: PosicionGrupo[] = ['Porteros', 'Defensas', 'Centrocampistas', 'Delanteros', 'Otros'];

function normalizarPosicion(posicion?: string): PosicionGrupo {
  if (!posicion) return 'Otros';
  const p = posicion.toLowerCase();
  if (p.includes('portero') || p === 'gk' || p === 'goalkeeper') return 'Porteros';
  if (p.includes('defensa') || p === 'df' || p === 'defender' || p.includes('central') || p.includes('lateral')) return 'Defensas';
  if (p.includes('centrocampista') || p === 'mf' || p === 'midfielder' || p.includes('medio') || p.includes('pivote')) return 'Centrocampistas';
  if (p.includes('delantero') || p === 'fw' || p === 'forward' || p.includes('extremo') || p.includes('punta')) return 'Delanteros';
  return 'Otros';
}

function fotoUrl(jugador: Jugador): string | null {
  if (jugador.foto) return jugador.foto;
  if (jugador.sofascoreId) return `https://api.sofascore.app/api/v1/player/${jugador.sofascoreId}/image`;
  return null;
}

function nombreCompleto(jugador: Jugador): string {
  return jugador.apellidos ? `${jugador.nombre} ${jugador.apellidos}` : jugador.nombre;
}

function PlaceholderAvatar({ nombre, size = 52 }: { nombre: string; size?: number }) {
  const inicial = nombre.charAt(0).toUpperCase();
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.38 }]}>{inicial}</Text>
    </View>
  );
}

function JugadorFoto({ jugador, size = 52 }: { jugador: Jugador; size?: number }) {
  const [error, setError] = useState(false);
  const url = fotoUrl(jugador);
  if (!url || error) return <PlaceholderAvatar nombre={jugador.nombre} size={size} />;
  return (
    <Image
      source={{ uri: url }}
      style={{ width: size, height: size, borderRadius: size / 2 }}
      onError={() => setError(true)}
    />
  );
}

interface Section {
  title: PosicionGrupo;
  data: Jugador[];
}

export default function PlantillaScreen() {
  const navigation = useNavigation<any>();
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadPlantilla = useCallback(async () => {
    try {
      const { data } = await api.get<Jugador[]>('/api/jugadores');
      const agrupados: Record<PosicionGrupo, Jugador[]> = {
        Porteros: [],
        Defensas: [],
        Centrocampistas: [],
        Delanteros: [],
        Otros: [],
      };
      (data ?? []).forEach((j) => {
        agrupados[normalizarPosicion(j.posicion)].push(j);
      });
      const result: Section[] = POSICION_ORDEN
        .filter((g) => agrupados[g].length > 0)
        .map((g) => ({ title: g, data: agrupados[g] }));
      setSections(result);
    } catch (_) {}
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { loadPlantilla(); }, [loadPlantilla]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadPlantilla();
  }, [loadPlantilla]);

  const goDetalle = (id: number) => navigation.navigate('JugadorDetalle', { id });

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>Plantilla</Text>
      </View>
      <SectionList
        sections={sections}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
        contentContainerStyle={styles.list}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText}>{section.title.toUpperCase()}</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.jugadorCard} onPress={() => goDetalle(item.id)} activeOpacity={0.75}>
            <JugadorFoto jugador={item} size={52} />
            <View style={styles.jugadorInfo}>
              <Text style={styles.jugadorNombre} numberOfLines={1}>{nombreCompleto(item)}</Text>
              <Text style={styles.jugadorPosicion}>{item.posicion ?? '—'}</Text>
            </View>
            {item.dorsal != null && (
              <View style={styles.dorsalBadge}>
                <Text style={styles.dorsalText}>{item.dorsal}</Text>
              </View>
            )}
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Sin jugadores disponibles</Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerBar: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  headerTitle: {
    color: colors.white,
    fontSize: 20,
    fontWeight: 'bold',
  },
  list: { paddingBottom: 24 },
  sectionHeader: {
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    marginTop: 12,
  },
  sectionHeaderText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.primary,
    letterSpacing: 1.2,
  },
  jugadorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    padding: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  avatar: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: colors.white, fontWeight: 'bold' },
  jugadorInfo: { flex: 1 },
  jugadorNombre: { fontSize: 15, fontWeight: '600', color: colors.text },
  jugadorPosicion: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  dorsalBadge: {
    backgroundColor: colors.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dorsalText: { color: colors.white, fontWeight: 'bold', fontSize: 14 },
  chevron: { color: colors.textSecondary, fontSize: 22, marginLeft: 4 },
  emptyText: { textAlign: 'center', color: colors.textSecondary, marginTop: 40, fontSize: 14 },
});
