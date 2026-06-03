import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import api from '../../services/api';
import { humanizeError } from '../../services/errors';
import { ESCUDO_URL } from '../../constants';

export default function RecuperarPasswordScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const prefilledEmail: string | undefined = route.params?.prefilledEmail;
  const [email, setEmail] = useState(prefilledEmail ?? '');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    if (!email.trim()) {
      setError('Introduce tu email');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await api.post('/api/authenticate/recuperar-password', { email: email.trim().toLowerCase() });
      setSent(true);
    } catch (e: any) {
      const msg = humanizeError(e, 'recover');
      setError(msg);
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.topRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Text style={styles.backText}>‹ Atrás</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.header}>
            <Image
              source={{ uri: ESCUDO_URL }}
              style={styles.escudoImg}
              resizeMode="contain"
              accessibilityLabel="Escudo Algeciras CF"
            />
            <Text style={styles.title}>Recuperar contraseña</Text>
            <Text style={styles.subtitle}>
              Introduce tu email y te enviaremos instrucciones para restablecer tu contraseña.
            </Text>
          </View>

          <View style={styles.form}>
            {sent ? (
              <View style={styles.successBox}>
                <Text style={styles.successIcon}>✉️</Text>
                <Text style={styles.successTitle}>Email enviado</Text>
                <Text style={styles.successText}>
                  Te hemos enviado un email con instrucciones para restablecer tu contraseña.
                  Revisa tu bandeja de entrada y la carpeta de spam.
                </Text>
                <TouchableOpacity
                  style={styles.button}
                  onPress={() => navigation.goBack()}
                >
                  <Text style={styles.buttonText}>Volver al login</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="tu@email.com"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoCorrect={false}
                />
                {error && <Text style={styles.error}>{error}</Text>}
                <TouchableOpacity
                  style={[styles.button, loading && styles.buttonDisabled]}
                  onPress={handleSend}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <Text style={styles.buttonText}>Enviar enlace</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.primary },
  container: { flexGrow: 1, padding: 24, backgroundColor: colors.primary },
  topRow: { paddingTop: 8, paddingBottom: 8 },
  backBtn: { paddingVertical: 6 },
  backText: { color: colors.white, fontSize: 16, fontWeight: '600' },
  header: { alignItems: 'center', marginTop: 20, marginBottom: 30 },
  escudoImg: { width: 80, height: 80, marginBottom: 14 },
  title: { fontSize: 24, fontWeight: 'bold', color: colors.white, textAlign: 'center' },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 12,
    lineHeight: 20,
  },
  form: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  label: { fontSize: 14, color: colors.text, marginBottom: 6, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: colors.white,
    color: colors.text,
  },
  error: { color: colors.error, marginTop: 12, textAlign: 'center' },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: colors.white, fontSize: 16, fontWeight: 'bold' },
  successBox: { alignItems: 'center', paddingVertical: 12 },
  successIcon: { fontSize: 48, marginBottom: 12 },
  successTitle: { fontSize: 18, fontWeight: 'bold', color: colors.primary, marginBottom: 8 },
  successText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
});
