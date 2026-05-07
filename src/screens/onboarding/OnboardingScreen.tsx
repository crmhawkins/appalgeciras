import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Image,
  Dimensions, NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/colors';
import { ESCUDO_URL } from '../../constants';

const { width } = Dimensions.get('window');

export const ONBOARDING_KEY = 'onboarding_done';

interface Slide {
  key: string;
  icon: 'escudo' | string;
  title: string;
  text: string;
}

const SLIDES: Slide[] = [
  {
    key: '1',
    icon: 'escudo',
    title: 'Bienvenido a la app oficial del Algeciras CF',
    text: 'Vive el fútbol desde más cerca. Partidos, plantilla, noticias y mucho más.',
  },
  {
    key: '2',
    icon: '🎟️',
    title: 'Compra tus abonos y entradas',
    text: 'Elige tu asiento y paga de forma segura con Stripe directamente desde la app.',
  },
  {
    key: '3',
    icon: '⚽',
    title: 'Únete a la FanZone',
    text: 'Vota al mejor jugador del partido y chatea en directo con otros aficionados.',
  },
];

interface Props {
  onDone: () => void;
}

export default function OnboardingScreen({ onDone }: Props) {
  const flatListRef = useRef<FlatList>(null);
  const [index, setIndex] = useState(0);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== index) setIndex(i);
  };

  const finish = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    } catch (_) {}
    onDone();
  };

  const next = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (index < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: index + 1, animated: true });
    } else {
      finish();
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.skipRow}>
        {index < SLIDES.length - 1 ? (
          <TouchableOpacity onPress={finish}>
            <Text style={styles.skipText}>Saltar</Text>
          </TouchableOpacity>
        ) : <View />}
      </View>

      <FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(s) => s.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            {item.icon === 'escudo' ? (
              <Image source={{ uri: ESCUDO_URL }} style={styles.escudo} resizeMode="contain" accessibilityLabel="Escudo Algeciras CF" />
            ) : (
              <Text style={styles.iconBig}>{item.icon}</Text>
            )}
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.text}>{item.text}</Text>
          </View>
        )}
      />

      <View style={styles.dotsRow}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, index === i && styles.dotActive]}
          />
        ))}
      </View>

      <View style={styles.btnRow}>
        <TouchableOpacity style={styles.btn} onPress={next}>
          <Text style={styles.btnText}>
            {index < SLIDES.length - 1 ? 'Siguiente →' : 'Empezar →'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  skipRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 12,
    minHeight: 44,
  },
  skipText: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  escudo: { width: 180, height: 180, marginBottom: 32 },
  iconBig: { fontSize: 120, marginBottom: 32 },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 16,
  },
  text: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.primary,
    width: 24,
  },
  btnRow: { paddingHorizontal: 24, paddingBottom: 16, paddingTop: 8 },
  btn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnText: { color: colors.white, fontWeight: 'bold', fontSize: 16 },
});
