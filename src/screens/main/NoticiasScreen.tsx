import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import WebView from 'react-native-webview';
import { colors } from '../../theme/colors';

type Tab = 'blog' | 'tv';

const URLS: Record<Tab, string> = {
  blog: 'https://algecirasclubdefutbol.com/blog/',
  tv: 'https://algecirasclubdefutbol.com/algeciras-tv-2/',
};

export default function NoticiasScreen() {
  const [tab, setTab] = useState<Tab>('blog');
  const [loading, setLoading] = useState(true);

  const switchTab = (t: Tab) => {
    if (t !== tab) {
      setLoading(true);
      setTab(t);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'blog' && styles.tabBtnActive]}
          onPress={() => switchTab('blog')}
        >
          <Text style={[styles.tabText, tab === 'blog' && styles.tabTextActive]}>📰 Blog</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'tv' && styles.tabBtnActive]}
          onPress={() => switchTab('tv')}
        >
          <Text style={[styles.tabText, tab === 'tv' && styles.tabTextActive]}>📺 Algeciras TV</Text>
        </TouchableOpacity>
      </View>

      <WebView
        key={tab}
        source={{ uri: URLS[tab] }}
        onLoadEnd={() => setLoading(false)}
        style={styles.webview}
      />
      {loading && (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  tabBtnActive: {
    backgroundColor: colors.secondary,
  },
  tabText: { color: 'rgba(255,255,255,0.8)', fontWeight: '600', fontSize: 14 },
  tabTextActive: { color: colors.primary, fontWeight: 'bold' },
  webview: { flex: 1 },
  loader: {
    ...StyleSheet.absoluteFillObject,
    top: 54,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
