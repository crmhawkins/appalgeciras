import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../theme/colors';

interface SeccionAtajoProps {
  icon: string;
  label: string;
  count?: number | null;
  onPress: () => void;
  style?: ViewStyle;
  highlight?: boolean;
}

export default function SeccionAtajo({
  icon, label, count, onPress, style, highlight,
}: SeccionAtajoProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[
        styles.card,
        highlight && styles.cardHighlight,
        style,
      ]}
    >
      <View style={styles.iconWrap}>
        <Text style={styles.icon}>{icon}</Text>
        {typeof count === 'number' && count > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{count > 99 ? '99+' : count}</Text>
          </View>
        )}
      </View>
      <Text style={styles.label} numberOfLines={2}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 96,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHighlight: {
    borderColor: colors.primary,
    backgroundColor: '#fff5f6',
  },
  iconWrap: { position: 'relative', marginBottom: 8 },
  icon: { fontSize: 28 },
  countBadge: {
    position: 'absolute',
    top: -6,
    right: -14,
    backgroundColor: colors.primary,
    borderRadius: 999,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  countBadgeText: { color: colors.white, fontSize: 11, fontWeight: '800' },
  label: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '700',
    textAlign: 'center',
  },
});
