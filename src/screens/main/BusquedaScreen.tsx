import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, TextInput, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Image, Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import api from '../../services/api';
import { Noticia } from '../../types';

interface Jugador {
  id: number;
  nombre: string;
  apellidos?: string;
  dorsal?: number;
  posicion?: string;
  foto?: string;
}

function fotoUrl(j: Jugador): string | null {
  if (j.foto) return j.foto;
  if (j.dorsal && j.dorsal >= 1 && j.dorsal <= 25) {
    return `https://backend-algeciras.hawkins.es/acf/2025/10/${j.dorsal}.png`;
  }
  return null;
}

function nombreCompleto(j: Jugador): string {
  return j.apellidos ? `${j.nombre} ${j.apellidos}` : j.nombre;
}

export default function BusquedaScreen() {
  const navigation = useNavigation<any>();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [noticias, setNoticias] = useState<Noticia[]>([]);
  const [jugadores, setJugadores] = useState<Jugador[]>([]);
  const [loadingN, setLoadingN] = useState(false);
  const [loadingJ, setLoadingJ] = useState(false);
  const allJugadoresRef = useRef<Jugador[] | null>(null);

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
    try {
      const { data } = await api.get<{ noticias: Noticia[] }>('/api/noticias', { params: { q, limit: 5 } });
      setNoticias(data?.noticias ?? []);
    } catch (_) { setNoticias([]); }
    finally { setLoadingN(false); }

    // Jugadores
    setLoadingJ(true);
    try {
      const ql = q.toLowerCase();
      const list = allJugadoresRef.current ?? [];
      const filtered = list.filter((j) =>
        nombreCompleto(j).toLowerCase().includes(ql)
      ).slice(0, 8);
      setJugadores(filtered);
    } catch (_) { setJugadores([]); }
    finally { setLoadingJ(false); }
  }, []);

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
            <View style={styles.hintBox}>
              <Text style={styles.hintIcon}>🔍</Text>
              <Text style={styles.hintText}>Escribe para buscar noticias y jugadores</Text>
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
});
