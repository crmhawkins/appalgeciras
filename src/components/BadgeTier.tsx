import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Tier } from '../types';

interface BadgeTierProps {
  tier?: Tier;
  label?: string;
  style?: ViewStyle;
  size?: 'sm' | 'md';
}

const TIER_META: Record<Tier, { label: string; bg: string; fg: string }> = {
  aficionado:   { label: 'AFICIONADO',   bg: '#444444', fg: '#ffffff' },
  abonado:      { label: 'ABONADO',      bg: '#C8102E', fg: '#ffffff' },
  abonado_vip:  { label: 'ABONADO VIP',  bg: '#C8A000', fg: '#1a1a1a' },
  peñista:      { label: 'PEÑISTA',      bg: '#1e3a8a', fg: '#ffffff' },
};

export default function BadgeTier({ tier, label, style, size = 'md' }: BadgeTierProps) {
  const meta = (tier && TIER_META[tier]) || TIER_META.aficionado;
  const text = (label || meta.label || '').toUpperCase();
  return (
    <View
      style={[
        styles.badge,
        size === 'sm' ? styles.sm : styles.md,
        { backgroundColor: meta.bg },
        style,
      ]}
    >
      <Text style={[styles.text, { color: meta.fg }, size === 'sm' ? styles.textSm : styles.textMd]}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  sm: { paddingHorizontal: 8, paddingVertical: 2 },
  md: { paddingHorizontal: 10, paddingVertical: 4 },
  text: { fontWeight: '800', letterSpacing: 0.6 },
  textSm: { fontSize: 9 },
  textMd: { fontSize: 10 },
});
