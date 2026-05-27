import React from 'react';
import {
  View, Text, StyleSheet, Image, ViewStyle, useWindowDimensions,
} from 'react-native';
import { Usuario } from '../types';
import { colors } from '../theme/colors';
import { ESCUDO_URL, TEMPORADA_CORTA, CLUB_NOMBRE } from '../constants';
import BadgeTier from './BadgeTier';

interface CarnetSocioProps {
  usuario: Usuario | null;
  size?: 'compact' | 'fullscreen';
  style?: ViewStyle;
}

/**
 * Carnet visual del socio — estilo apps grandes (RM, Barça):
 *  · Aspect 16:10
 *  · Gradient simulado negro → rojo (varios Views superpuestos)
 *  · Escudo translúcido como filigrana de fondo
 *  · Foto perfil circular + nombre + nº socio mono
 *  · Badge tier de color
 */
export default function CarnetSocio({ usuario, size = 'compact', style }: CarnetSocioProps) {
  const { width: screenW } = useWindowDimensions();
  const isFullscreen = size === 'fullscreen';
  const w = isFullscreen ? screenW - 32 : screenW - 32;
  const h = Math.round(w * (10 / 16));

  const nombre = usuario?.nombre || usuario?.name || 'Aficionado';
  const socioNumber = usuario?.socioNumber ?? usuario?.customer?.socioNumber;
  const tier = usuario?.customer?.tier;
  const tierLabel = usuario?.customer?.tierLabel;

  const initials = nombre
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';

  return (
    <View style={[styles.card, { width: w, height: h }, style]}>
      {/* Capa base negra */}
      <View style={styles.layerBlack} />
      {/* Bandas rojas superpuestas (gradient simulado de izq→der) */}
      <View style={[styles.layerRed, { opacity: 0.18, left: '40%' }]} />
      <View style={[styles.layerRed, { opacity: 0.32, left: '55%' }]} />
      <View style={[styles.layerRed, { opacity: 0.55, left: '72%' }]} />
      <View style={[styles.layerRed, { opacity: 0.85, left: '88%' }]} />

      {/* Escudo translúcido (filigrana) */}
      <Image
        source={{ uri: ESCUDO_URL }}
        style={[
          styles.escudoBg,
          { width: h * 1.1, height: h * 1.1, right: -h * 0.15, top: -h * 0.05 },
        ]}
        resizeMode="contain"
      />

      {/* Contenido */}
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.club}>{CLUB_NOMBRE.toUpperCase()}</Text>
          <Text style={styles.temporada}>TEMP {TEMPORADA_CORTA}</Text>
        </View>

        {/* Cuerpo */}
        <View style={styles.body}>
          <View style={styles.avatarWrap}>
            {usuario?.profileImage ? (
              <Image source={{ uri: usuario.profileImage }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarInitials}>{initials}</Text>
              </View>
            )}
          </View>
          <View style={styles.info}>
            <Text style={styles.nombre} numberOfLines={2}>{nombre}</Text>
            {socioNumber ? (
              <Text style={styles.socioNumero}>
                Nº {String(socioNumber).padStart(5, '0')}
              </Text>
            ) : (
              <Text style={styles.socioNumeroDim}>Sin nº socio</Text>
            )}
            <BadgeTier tier={tier} label={tierLabel} size={isFullscreen ? 'md' : 'sm'} style={{ marginTop: 6 }} />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#0a0a0a',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
  },
  layerBlack: { ...StyleSheet.absoluteFillObject, backgroundColor: '#0a0a0a' },
  layerRed: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: '70%',
    backgroundColor: colors.primary,
  },
  escudoBg: { position: 'absolute', opacity: 0.10 },
  content: { flex: 1, padding: 14, justifyContent: 'space-between' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  club: { color: '#fff', fontSize: 14, fontWeight: '800', letterSpacing: 1 },
  temporada: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    opacity: 0.85,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  body: { flexDirection: 'row', alignItems: 'flex-end' },
  avatarWrap: { marginRight: 12 },
  avatar: {
    width: 64, height: 64, borderRadius: 32,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)',
    backgroundColor: '#222',
  },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { color: '#fff', fontSize: 22, fontWeight: '800' },
  info: { flex: 1 },
  nombre: { color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: 0.2 },
  socioNumero: {
    color: '#fff', fontSize: 14, fontWeight: '700', marginTop: 4,
    fontFamily: 'monospace', letterSpacing: 2,
  },
  socioNumeroDim: {
    color: 'rgba(255,255,255,0.55)', fontSize: 12, marginTop: 4, fontStyle: 'italic',
  },
});
