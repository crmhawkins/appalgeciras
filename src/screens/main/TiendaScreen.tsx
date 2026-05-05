import React, { useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import WebView from 'react-native-webview';
import { colors } from '../../theme/colors';

export default function TiendaScreen() {
  const [loading, setLoading] = useState(true);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <WebView
        source={{ uri: 'https://latiendadelalgeciras.com/' }}
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
  webview: { flex: 1 },
  loader: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
