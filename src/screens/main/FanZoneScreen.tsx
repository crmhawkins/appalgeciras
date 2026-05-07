import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl, FlatList,
  TextInput, KeyboardAvoidingView, Platform, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import api, { API_BASE_URL } from '../../services/api';
import { Partido } from '../../types';
import { io, Socket } from 'socket.io-client';
import { TEMPORADA_CORTA, COMPETICION } from '../../constants';

interface VotoResult {
  jugador: string;
  votos: number;
  porcentaje: number;
}

interface PartidoConJugadores extends Partido {
  jugadoresLocales?: string[];
}

interface ChatMessage {
  id: string;
  userName: string;
  mensaje: string;
  timestamp: string;
}

// Players loaded dynamically from API — see loadJugadores()

export default function FanZoneScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();

  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [partidoActivo, setPartidoActivo] = useState<Partido | null>(null);
  const [estadioInfo, setEstadioInfo] = useState<any>(null);
  const [jugadores, setJugadores] = useState<string[]>([]);
  const [votos, setVotos] = useState<VotoResult[]>([]);
  const [miVoto, setMiVoto] = useState<string | null>(null);
  const [totalVotos, setTotalVotos] = useState(0);
  const [loading, setLoading] = useState(true);
  const [votando, setVotando] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Chat state
  const [mensajes, setMensajes] = useState<ChatMessage[]>([]);
  const [inputMensaje, setInputMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const loadJugadores = useCallback(async () => {
    try {
      const { data } = await api.get('/api/jugadores');
      const plantilla = data.plantilla ?? {};
      const nombres: string[] = [
        ...(plantilla.porteros ?? []),
        ...(plantilla.defensas ?? []),
        ...(plantilla.centrocampistas ?? []),
        ...(plantilla.delanteros ?? []),
      ].map((j: any) => j.nombreCorto || j.nombre);
      if (nombres.length > 0) setJugadores(nombres);
    } catch {
      // fallback: keep existing state (empty on first load)
    }
  }, []);

  const loadPartidos = useCallback(async () => {
    try {
      const { data } = await api.get('/api/partidos');
      const lista: Partido[] = Array.isArray(data) ? data : ((data as any).partidos ?? []);
      setPartidos(lista);
      const activo = [...lista]
        .filter(p => p.marcador !== null && p.marcador !== undefined)
        .sort((a, b) => b.fecha.localeCompare(a.fecha))[0] ?? lista[0] ?? null;
      setPartidoActivo(activo);
      return activo;
    } catch { return null; }
  }, []);

  const loadVotos = useCallback(async (pid: number) => {
    try {
      const { data } = await api.get(`/api/fanzone/${pid}/votos`);
      setVotos(data.resultado ?? []);
      setTotalVotos(data.total ?? 0);
    } catch {}
  }, []);

  const loadMiVoto = useCallback(async (pid: number) => {
    if (!user) return;
    try {
      const { data } = await api.get(`/api/fanzone/${pid}/mi-voto`);
      setMiVoto(data.voto);
    } catch {}
  }, [user]);

  const load = useCallback(async () => {
    setLoading(true);
    const activo = await loadPartidos();
    await loadJugadores();
    if (activo) {
      await Promise.all([loadVotos(activo.id), loadMiVoto(activo.id)]);
    }
    setLoading(false);
  }, [loadPartidos, loadJugadores, loadVotos, loadMiVoto]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  useEffect(() => { load(); }, [load]);

  // Cargar info del estadio desde la API
  useEffect(() => {
    let cancelled = false;
    api.get('/api/estadio')
      .then(({ data }) => {
        if (cancelled) return;
        const info = data?.estadio ?? data;
        if (info) setEstadioInfo(info);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Scroll al fondo cuando llegan mensajes nuevos
  useEffect(() => {
    if (mensajes.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [mensajes.length]);

  // Socket.io: conectar cuando hay partido activo
  useEffect(() => {
    if (!partidoActivo) return;

    const socket = io(API_BASE_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join_partido', partidoActivo.id);
    });

    socket.on('connect_error', (err) => {
      console.warn('[Chat] Error de conexión:', err.message);
    });

    socket.on('history', (history: ChatMessage[]) => {
      setMensajes(history);
    });

    socket.on('new_message', (msg: ChatMessage) => {
      setMensajes(prev => [...prev, msg]);
    });

    socket.on('rate_limit', ({ msg }: { msg: string }) => {
      Alert.alert('Chat', msg);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [partidoActivo?.id]);

  const handleEnviarMensaje = () => {
    const texto = inputMensaje.trim();
    if (!texto || !socketRef.current || !partidoActivo || enviando) return;

    const rawName = (user as any)?.nombre || (user as any)?.email || 'Aficionado';
    const userName = rawName;

    setEnviando(true);
    setInputMensaje('');
    socketRef.current.emit('send_message', {
      partidoId: partidoActivo.id,
      mensaje: texto,
      userName,
    });
    // Re-enable after short debounce (server echo via new_message re-enables naturally)
    setTimeout(() => setEnviando(false), 500);
  };

  const formatHora = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    } catch { return ''; }
  };

  const handleVotar = async (jugador: string) => {
    if (!user) {
      Alert.alert('Inicia sesión', 'Necesitas cuenta para votar', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Iniciar sesión', onPress: () => navigation.navigate('Auth', { screen: 'Login' }) },
      ]);
      return;
    }
    if (!partidoActivo) return;
    setVotando(true);
    try {
      await api.post(`/api/fanzone/${partidoActivo.id}/votar`, { jugador });
      setMiVoto(jugador);
      await loadVotos(partidoActivo.id);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.msg || 'Error al votar');
    } finally {
      setVotando(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}><Text style={styles.headerTitle}>Fan Zone</Text></View>
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>⚡ Fan Zone</Text>
        <Text style={styles.headerSub}>Algeciras C.F. · El Mirador</Text>
      </View>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
        >
          {/* Partido activo */}
          {partidoActivo && (
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Partido activo</Text>
              <View style={styles.matchRow}>
                <Text style={styles.teamName} numberOfLines={1}>{partidoActivo.equipoLocal}</Text>
                <View style={styles.scoreBox}>
                  <Text style={styles.score}>{partidoActivo.marcador ?? 'vs'}</Text>
                </View>
                <Text style={styles.teamName} numberOfLines={1}>{partidoActivo.equipoVisitante}</Text>
              </View>
            </View>
          )}

          {/* Fan of the Match */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>⭐ Fan of the Match</Text>
            <Text style={styles.sectionSubtitle}>
              {miVoto ? `Tu voto: ${miVoto}` : 'Vota al mejor jugador del partido'}
            </Text>

            {!partidoActivo ? (
              <Text style={styles.emptyText}>No hay partido activo para votar</Text>
            ) : jugadores.length === 0 ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 12 }} />
            ) : (
              <View style={styles.jugadoresGrid}>
                {jugadores.map((j) => {
                  const isSelected = miVoto === j;
                  const votoData = votos.find(v => v.jugador === j);
                  return (
                    <TouchableOpacity
                      key={j}
                      style={[styles.jugadorBtn, isSelected && styles.jugadorBtnSelected]}
                      onPress={() => handleVotar(j)}
                      disabled={votando}
                    >
                      <Text style={[styles.jugadorName, isSelected && styles.jugadorNameSelected]}>{j}</Text>
                      {votoData && (
                        <Text style={[styles.jugadorVotos, isSelected && styles.jugadorVotosSelected]}>
                          {votoData.porcentaje}%
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          {/* Resultados */}
          {votos.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>📊 Resultados ({totalVotos} votos)</Text>
              {votos.slice(0, 5).map((v, i) => (
                <View key={v.jugador} style={styles.resultRow}>
                  <Text style={styles.resultPos}>{i + 1}°</Text>
                  <Text style={styles.resultNombre} numberOfLines={1}>{v.jugador}</Text>
                  <View style={styles.barContainer}>
                    <View style={[styles.bar, { width: `${v.porcentaje}%` as any }]} />
                  </View>
                  <Text style={styles.resultPct}>{v.porcentaje}%</Text>
                </View>
              ))}
            </View>
          )}

          {/* Chat en tiempo real */}
          {partidoActivo && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>💬 Chat</Text>

              {/* Lista mensajes */}
              <View style={styles.chatContainer}>
                {mensajes.length === 0 ? (
                  <Text style={styles.emptyText}>Sin mensajes. ¡Sé el primero!</Text>
                ) : (
                  <FlatList
                    ref={flatListRef}
                    data={mensajes}
                    keyExtractor={(item) => item.id}
                    style={styles.chatList}
                    renderItem={({ item }) => {
                      const esMio = user && (
                        item.userName === ((user as any)?.nombre || (user as any)?.email)
                      );
                      return (
                        <View style={[styles.mensajeRow, esMio && styles.mensajeRowMio]}>
                          <Text style={[styles.mensajeUsuario, esMio && styles.mensajeUsuarioMio]}>
                            {esMio ? 'Tú' : item.userName}
                          </Text>
                          <Text style={styles.mensajeTexto}>{item.mensaje}</Text>
                          <Text style={styles.mensajeHora}>{formatHora(item.timestamp)}</Text>
                        </View>
                      );
                    }}
                  />
                )}
              </View>

              {/* Input envío */}
              {user ? (
                <View style={styles.chatInputRow}>
                  <TextInput
                    style={styles.chatInput}
                    placeholder="Escribe un mensaje..."
                    placeholderTextColor={colors.textSecondary}
                    value={inputMensaje}
                    onChangeText={setInputMensaje}
                    onSubmitEditing={handleEnviarMensaje}
                    returnKeyType="send"
                    maxLength={200}
                  />
                  <TouchableOpacity
                    style={[styles.sendBtn, (!inputMensaje.trim() || enviando) && styles.sendBtnDisabled]}
                    onPress={handleEnviarMensaje}
                    disabled={!inputMensaje.trim() || enviando}
                  >
                    <Text style={styles.sendBtnText}>Enviar</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity onPress={() => navigation.navigate('Auth', { screen: 'Login' })}>
                  <Text style={styles.chatLoginText}>Inicia sesión para participar en el chat</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Estadio */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              🏟️ {estadioInfo?.nombre ?? 'Estadio Municipal El Mirador'}
            </Text>
            <Text style={styles.infoLine}>
              📍 {estadioInfo?.direccion ?? 'Algeciras, Cádiz'}
              {estadioInfo?.capacidad ? ` · Aforo: ${Number(estadioInfo.capacidad).toLocaleString('es-ES')} espectadores` : ' · Aforo: 8.500 espectadores'}
            </Text>
            <Text style={styles.infoLine}>🎽 Temporada {TEMPORADA_CORTA} · {COMPETICION}</Text>
            {estadioInfo?.fundacion ? (
              <Text style={styles.infoLine}>📅 Fundado en {estadioInfo.fundacion}</Text>
            ) : (
              <Text style={styles.infoLine}>📅 Fundado en 1912</Text>
            )}
            <TouchableOpacity onPress={() => navigation.navigate('Estadio')} style={{ marginTop: 8 }}>
              <Text style={{ color: colors.primary, fontWeight: 'bold', fontSize: 13 }}>Ver estadio →</Text>
            </TouchableOpacity>
          </View>

          {/* Redes Sociales */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>📲 Redes Sociales</Text>
            <TouchableOpacity style={styles.socialBtn} onPress={() => Linking.openURL('https://www.instagram.com/algecirascf_oficial/')}>
              <Text style={styles.socialBtnText}>📸 Instagram @algecirascf_oficial</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialBtn} onPress={() => Linking.openURL('https://twitter.com/AlgecirasCF')}>
              <Text style={styles.socialBtnText}>🐦 Twitter / X @AlgecirasCF</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialBtn} onPress={() => Linking.openURL('https://www.youtube.com/@Algeciras_cf')}>
              <Text style={styles.socialBtnText}>▶️ YouTube Algeciras CF</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { padding: 16, backgroundColor: colors.primary },
  headerTitle: { color: colors.white, fontSize: 20, fontWeight: 'bold' },
  headerSub: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 2 },
  container: { padding: 16, paddingBottom: 32 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  cardLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  matchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  teamName: { flex: 1, fontSize: 15, fontWeight: 'bold', color: colors.text, textAlign: 'center' },
  scoreBox: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginHorizontal: 8,
  },
  score: { color: colors.white, fontWeight: 'bold', fontSize: 18 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: colors.primary, marginBottom: 4 },
  sectionSubtitle: { fontSize: 13, color: colors.textSecondary, marginBottom: 14 },
  emptyText: { color: colors.textSecondary, textAlign: 'center', paddingVertical: 12 },
  jugadoresGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  jugadorBtn: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    backgroundColor: colors.background,
    minWidth: '45%',
    flex: 1,
  },
  jugadorBtnSelected: { borderColor: colors.primary, backgroundColor: '#e8f5ee' },
  jugadorName: { fontSize: 13, color: colors.text, fontWeight: '600' },
  jugadorNameSelected: { color: colors.primary },
  jugadorVotos: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  jugadorVotosSelected: { color: colors.primary },
  resultRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 6 },
  resultPos: { width: 22, fontSize: 13, fontWeight: 'bold', color: colors.primary },
  resultNombre: { width: 110, fontSize: 13, color: colors.text },
  barContainer: { flex: 1, height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden' },
  bar: { height: 8, backgroundColor: colors.primary, borderRadius: 4 },
  resultPct: { width: 36, fontSize: 12, color: colors.textSecondary, textAlign: 'right' },
  infoLine: { fontSize: 13, color: colors.textSecondary, marginTop: 6, lineHeight: 20 },
  socialBtn: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  socialBtnText: { fontSize: 14, color: colors.primary, fontWeight: '500' },
  // Chat styles
  chatContainer: {
    minHeight: 180,
    maxHeight: 300,
    backgroundColor: colors.background,
    borderRadius: 8,
    marginBottom: 12,
    overflow: 'hidden',
  },
  chatList: { flex: 1, padding: 8 },
  mensajeRow: { marginBottom: 10, paddingHorizontal: 4 },
  mensajeRowMio: { alignItems: 'flex-end' },
  mensajeUsuario: { fontSize: 12, fontWeight: 'bold', color: colors.primary, marginBottom: 1 },
  mensajeUsuarioMio: { color: colors.textSecondary },
  mensajeTexto: { fontSize: 14, color: colors.text },
  mensajeHora: { fontSize: 10, color: colors.textSecondary, marginTop: 2 },
  chatInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chatInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.background,
  },
  sendBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnText: { color: colors.white, fontWeight: 'bold', fontSize: 14 },
  chatLoginText: {
    textAlign: 'center',
    color: colors.primary,
    fontSize: 14,
    paddingVertical: 8,
    textDecorationLine: 'underline',
  },
});
