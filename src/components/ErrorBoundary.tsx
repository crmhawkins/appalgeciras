import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface State { hasError: boolean; error?: Error }
export class ErrorBoundary extends React.Component<{ children: React.ReactNode; fallback?: string }, State> {
  state: State = { hasError: false };
  static getDerivedStateFromError(error: Error): State { return { hasError: true, error }; }
  componentDidCatch(error: Error, info: React.ErrorInfo) { console.error('[ErrorBoundary]', error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <View style={s.container}>
          <Text style={s.title}>Algo salió mal</Text>
          <Text style={s.sub}>{this.props.fallback ?? 'Toca para reintentar'}</Text>
          <TouchableOpacity style={s.btn} onPress={() => this.setState({ hasError: false })}>
            <Text style={s.btnText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}
const s = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#0a1628' },
  title: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  sub: { fontSize: 14, color: '#999', textAlign: 'center', marginBottom: 24 },
  btn: { backgroundColor: '#e8c876', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  btnText: { color: '#0a1628', fontWeight: '600' },
});
