import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator,
  useWindowDimensions, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useKeepAwake } from 'expo-keep-awake';
import QRCode from 'react-native-qrcode-svg';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme/colors';
import { ESCUDO_URL, CLUB_NOMBRE, TEMPORADA_CORTA } from '../../constants';
import BadgeTier from '../../components/BadgeTier';
import { Abono } from '../../types';

export default function CarnetScreen() {
  useKeepAwake();
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const { width } = useWindowDimensions();

  const [loading, setLoading] = useState(true);
  const [abono, setAbono] = useState<Abono | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    api.get(`/api/abonos/usuario/${user.id}`)
      .then((res) => {
        const d = res.data;
        const lista: Abono[] = Array.isArray(d) ? d : (d?.abonos ?? []);
        const activo = lista.find((a) => a?.activo !== false) ?? lista[0] ?? null;
        setAbono(activo);
      })
      .catch(() => setAbono(null))
      .finally(() => setLoading(false));
  }, [user?.id]);

  const qrValue =
    abono?.codigoAcceso ||
    abono?.codigoAbonado ||
    `algeciras-socio:${user?.id ?? '0'}:${user?.socioNumber ?? user?.customer?.socioNumber ?? '00000'}`;

  const nombre = user?.nombre || user?.name || '';
  const socioNumber = user?.socioNumber ?? user?.customer?.socioNumber;
  const qrSize = Math.min(width - 80, 320);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      {/* Escudo translúcido de fondo */}
      <Image source={{ uri: ESCUDO_URL }} style={styles.escudoBg} resizeMode="contain" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹  Atrás</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mi Carnet</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.club}>{CLUB_NOMBRE.toUpperCase()}</Text>
        <Text style={styles.temporada}>TEMPORADA {TEMPORADA_CORTA}</Text>

        <Text style={styles.nombre} numberOfLines={2}>{nombre}</Text>
        {socioNumber && (
          <Text style={styles.socioNumero}>Nº {String(socioNumber).padStart(5, '0')}</Text>
        )}
        <View style={{ marginTop: 8, marginBottom: 16 }}>
          <BadgeTier tier={user?.customer?.tier} label={user?.customer?.tierLabel} />
        </View>

        <View style={styles.qrBox}>
          {loading ? (
            <ActivityIndicator size="large" color={colors.primary} />
          ) : (
            <QRCode value={qrValue} size={qrSize} backgroundColor="#fff" color="#000" />
          )}
        </View>
        <Text style={styles.hint}>Muestra este código en el acceso</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#000' },
  escudoBg: {
    position: 'absolute',
    top: '15%',
    left: '5%',
    right: '5%',
    bottom: '15%',
    opacity: 0.06,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  backBtn: { padding: 8 },
  backText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  club: { color: '#fff', fontSize: 14, fontWeight: '800', letterSpacing: 2 },
  temporada: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginTop: 4 },
  nombre: { color: '#fff', fontSize: 24, fontWeight: '800', marginTop: 22, textAlign: 'center' },
  socioNumero: {
    color: '#fff', fontFamily: 'monospace', fontSize: 22, letterSpacing: 4, marginTop: 6,
    fontWeight: '700',
  },
  qrBox: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginTop: 6,
    elevation: 8,
    shadowColor: '#fff',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 18,
  },
  hint: { color: 'rgba(255,255,255,0.65)', fontSize: 13, marginTop: 18, fontStyle: 'italic' },
});
