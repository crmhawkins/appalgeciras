import React, { useEffect, useRef } from 'react';
import {
  View, Text, Image, StyleSheet, Animated, StatusBar, Dimensions,
} from 'react-native';
import { colors } from '../theme/colors';
import { ESCUDO_URL } from '../constants';

const { width } = Dimensions.get('window');

interface Props {
  onLayout?: () => void;
}

export default function SplashScreen({ onLayout }: Props = {}) {
  const scaleAnim  = useRef(new Animated.Value(0.6)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim  = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Entrada: escudo aparece con rebote suave
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 28,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Pulso suave mientras carga
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.06, duration: 1400, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1,    duration: 1400, useNativeDriver: true }),
        ]),
      ).start();
    });
  }, []);

  return (
    <View style={styles.container} onLayout={onLayout}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Círculo decorativo fondo — efecto viñeta suave */}
      <View style={styles.bgCircle} />

      <Animated.View
        style={[
          styles.content,
          { opacity: opacityAnim, transform: [{ scale: scaleAnim }] },
        ]}
      >
        {/* Halo detrás del escudo */}
        <Animated.View style={[styles.halo, { transform: [{ scale: pulseAnim }] }]} />

        {/* Escudo */}
        <Animated.Image
          source={{ uri: ESCUDO_URL }}
          style={[styles.escudo, { transform: [{ scale: pulseAnim }] }]}
          resizeMode="contain"
        />
      </Animated.View>

      {/* Texto club */}
      <Animated.View style={[styles.textBlock, { opacity: opacityAnim }]}>
        <Text style={styles.clubName}>ALGECIRAS CF</Text>
        <View style={styles.divider} />
        <Text style={styles.subtitle}>Temporada 2025 · 2026</Text>
      </Animated.View>

      {/* Barra amarilla inferior */}
      <View style={styles.bottomAccent} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Círculo decorativo rojo suave detrás del escudo
  bgCircle: {
    position: 'absolute',
    width: width * 1.1,
    height: width * 1.1,
    borderRadius: width * 0.55,
    backgroundColor: 'rgba(200,16,46,0.06)',
  },

  content: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 36,
  },

  // Halo rojo suave detrás del escudo
  halo: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(200,16,46,0.08)',
  },

  escudo: {
    width: 180,
    height: 180,
  },

  textBlock: {
    alignItems: 'center',
    gap: 8,
  },

  clubName: {
    color: colors.primary,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 4,
    textAlign: 'center',
  },

  divider: {
    width: 40,
    height: 2,
    backgroundColor: colors.primary,
    borderRadius: 1,
  },

  subtitle: {
    color: 'rgba(200,16,46,0.55)',
    fontSize: 13,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },

  bottomAccent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: colors.primary,
  },
});
