import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, TextInput, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Image, Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../../theme/colors';
import api from '../../services/api';
import { Noticia } from '../../types';
import { fotoUrl, nombreCompleto, JugadorBase } from '../../utils/jugadorUtils';

interface Jugador extends JugadorBase {
  id: number;
  posicion?: string;
}

const HISTORY_KEY = 'busquedas_recientes';
const MAX_HISTORY = 5;

export default function BusquedaScreen() {
  const navigation = useNavigation<any>();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [noticias, setNoticias] = useState<Noticia[]>([]);
  const [jugadores, setJugadores] = useState<Jugador[]>([]);
  const [loadingN, setLoadingN] = useState(false);
  const [loadingJ, setLoadingJ] = useState(false);
  const allJugadoresRef = useRef<Jugador[] | null>(null);
  const [historial, setHistorial] = useState<string[]>([]);

  // Load historial on mount
  useEffect(() => {
    AsyncStorage.getItem(HISTORY_KEY)
      .then(raw => {
        if (raw) setHistorial(JSON.parse(raw));
      })
      .catch(() => {});
  }, []);

  const saveToHistorial = useCallback(async (term: string) => {
    setHistorial(prev => {
      const filtered = prev.filter(t => t !== term);
      const updated = [term, ...filtered].slice(0, MAX_HISTORY);
      AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }, []);

  const clearHistorial = useCallback(() => {
    setHistorial([]);
    AsyncStorage.removeItem(HISTORY_KEY).catch(() => {});
  }, []);

  // Debounce
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  // Load full plantilla once for local filter
  useEffect(() => {
    let cancelled = false;
    api.get<any>('/api/jugadores')
      .then(({ data }) => {
        if (cancelled) return;
        const p = data?.plantilla ?? {};
        const flat: Jugador[] = [
          ...(p.porteros ?? []),
          ...(p.defensas ?? []),
          ...(p.centrocampistas ?? []),
          ...(p.delanteros ?? []),
        ];
        allJugadoresRef.current = flat;
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const search = useCallback(async (q: string) => {
    if (!q) {
      setNoticias([]);
      setJugadores([]);
      return;
    }
    // Noticias
    setLoadingN(true);
    let noticiasResult: Noticia[] = [];
    try {
      const { data } = await api.get<{ noticias: Noticia[] }>('/api/noticias', { params: { q, limit: 5 } });
      noticiasResult = data?.noticias ?? [];
      setNoticias(noticiasResult);
    } catch (_) { setNoticias([]); }
    finally { setLoadingN(false); }

    // Jugadores
    setLoadingJ(true);
    let jugadoresResult: Jugador[] = [];
    try {
      const ql = q.toLowerCase();
      const list = allJugadoresRef.current ?? [];
      jugadoresResult = list.filter((j) =>
        nombreCompleto(j).toLowerCase().includes(ql)
      ).slice(0, 8);
      setJugadores(jugadoresResult);
    } catch (_) { setJugadores([]); }
    finally { setLoadingJ(false); }

    // Save to historial if results found
    if (noticiasResult.length > 0 || jugadoresResult.length > 0) {
      saveToHistorial(q);
    }
  }, [saveToHistorial]);

  useEffect(() => { search(debounced); }, [debounced, search]);

  const data: { type: 'header' | 'noticia' | 'jugador' | 'empty'; key: string; payload?: any }[] = [];
  if (noticias.length > 0) {
    data.push({ type: 'header', key: 'h-noticias', payload: 'Noticias' });
    noticias.forEach((n) => data.push({ type: 'noticia', key: `n-${n.id}`, payload: n }));
  }
  if (jugadores.length > 0) {
    data.push({ type: 'header', key: 'h-jugadores', payload: 'Jugadores' });
    jugadores.forEach((j) => data.push({ type: 'jugador', key: `j-${j.id}`, payload: j }));
  }
  if (debounced && !loadingN && !loadingJ && noticias.length === 0 && jugadores.length === 0) {
    data.push({ type: 'empty', key: 'empty' });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar noticias, jugadores..."
          placeholderTextColor="rgba(255,255,255,0.7)"
          autoFocus
          returnKeyType="search"
          onSubmitEditing={() => Keyboard.dismiss()}
          autoCorrect={false}
        />
      </View>

      {(loadingN || loadingJ) && (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />
      )}

      <FlatList
        data={data}
        keyExtractor={(it) => it.key}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => {
          if (item.type === 'header') {
            return <Text style={styles.sectionTitle}>{item.payload}</Text>;
          }
          if (item.type === 'noticia') {
            const n: Noticia = item.payload;
            return (
              <TouchableOpacity
                style={styles.row}
                onPress={() => navigation.navigate('NoticiaDetalle', { slug: n.slug })}
              >
                {n.imagen ? (
                  <Image
                    source={{ uri: n.imagen }}
                    style={styles.thumb}
                    accessibilityLabel={n.titulo}
                  />
                ) : (
                  <View style={[styles.thumb, styles.thumbPlaceholder]}>
                    <Text style={styles.thumbIcon}>📰</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle} numberOfLines={2}>{n.titulo}</Text>
                  {n.extracto ? (
                    <Text style={styles.rowSub} numberOfLines={1}>{n.extracto}</Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          }
          if (item.type === 'jugador') {
            const j: Jugador = item.payload;
            const url = fotoUrl(j);
            return (
              <TouchableOpacity
                style={styles.row}
                onPress={() => navigation.navigate('JugadorDetalle', { id: j.id })}
              >
                {url ? (
                  <Image
                    source={{ uri: url }}
                    style={styles.avatar}
                    accessibilityLabel={nombreCompleto(j)}
                  />
                ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder]}>
                    <Text style={styles.avatarInitial}>{j.nombre.charAt(0).toUpperCase()}</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle} numberOfLines={1}>{nombreCompleto(j)}</Text>
                  <Text style={styles.rowSub}>
                    {j.dorsal != null ? `#${j.dorsal} · ` : ''}{j.posicion ?? '—'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }
          return (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>🔎</Text>
              <Text style={styles.emptyText}>Sin resultados para "{debounced}"</Text>
            </View>
          );
        }}
        ListEmptyComponent={
          !debounced ? (
            <View>
              {historial.length > 0 && (
                <View style={styles.historialSection}>
                  <View style={styles.historialHeader}>
                    <Text style={styles.historialTitle}>Búsquedas recientes</Text>
                    <TouchableOpacity onPress={clearHistorial}>
                      <Text style={styles.historialClear}>Limpiar</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.historialChips}>
                    {historial.map((term) => (
                      <TouchableOpacity
                        key={term}
                        style={styles.chip}
                        onPress={() => setQuery(term)}
                      >
                        <Text style={styles.chipText}>{term}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
              <View style={styles.hintBox}>
                <Text style={styles.hintIcon}>🔍</Text>
                <Text style={styles.hintText}>Escribe para buscar noticias y jugadores</Text>
              </View>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  backBtn: { width: 32, alignItems: 'center', justifyContent: 'center' },
  backText: { color: colors.white, fontSize: 28, fontWeight: '600' },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.18)',
    color: colors.white,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  listContent: { padding: 14, paddingBottom: 40 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.primary,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 14,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.secondary,
    paddingLeft: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  thumb: { width: 60, height: 60, borderRadius: 8, backgroundColor: colors.border },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  thumbIcon: { fontSize: 24 },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.border },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  avatarInitial: { color: colors.white, fontWeight: 'bold', fontSize: 18 },
  rowTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
  rowSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  emptyBox: { alignItems: 'center', paddingTop: 40 },
  emptyIcon: { fontSize: 38, marginBottom: 8 },
  emptyText: { color: colors.textSecondary, fontSize: 14 },
  hintBox: { alignItems: 'center', paddingTop: 60 },
  hintIcon: { fontSize: 44, marginBottom: 12 },
  hintText: { color: colors.textSecondary, fontSize: 14, textAlign: 'center', paddingHorizontal: 30 },
  historialSection: { marginBottom: 8 },
  historialHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  historialTitle: { fontSize: 13, fontWeight: 'bold', color: colors.primary, letterSpacing: 0.5, textTransform: 'uppercase' },
  historialClear: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
  historialChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  chipText: { fontSize: 13, color: colors.text },
});
