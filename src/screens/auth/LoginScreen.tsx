import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { AuthStackParamList } from '../../types';
import { ESCUDO_URL } from '../../constants';

export default function LoginScreen() {
  const { login } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPass, setShowPass] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Introduce email y contraseña');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    } catch (e: any) {
      const msg =
        e?.response?.data?.msg ||
        e?.message ||
        'Error al iniciar sesión';
      setError(msg);
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
          <View style={styles.header}>
            <Image
              source={{ uri: ESCUDO_URL }}
              style={styles.escudoImg}
              resizeMode="contain"
              accessibilityLabel="Escudo Algeciras CF"
            />
            <Text style={styles.title}>Algeciras CF</Text>
            <Text style={styles.subtitle}>Abonos Temporada</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="tu@email.com"
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />

            <Text style={styles.label}>Contraseña</Text>
            <View style={styles.passRow}>
              <TextInput
                ref={passwordRef}
                style={styles.passInput}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                secureTextEntry={!showPass}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPass(p => !p)}>
                <Text style={styles.eyeText}>{showPass ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>

            {error && <Text style={styles.error}>{error}</Text>}

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.buttonText}>Iniciar sesión</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.forgotLink}
              onPress={() => navigation.navigate('RecuperarPassword')}
            >
              <Text style={styles.forgotLinkText}>¿Olvidaste tu contraseña?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.registerLink}
              onPress={() => navigation.navigate('Register')}
            >
              <Text style={styles.registerLinkText}>
                ¿No tienes cuenta? <Text style={styles.registerLinkBold}>Regístrate</Text>
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.skipLink}
              onPress={() => navigation.navigate('Main')}
            >
              <Text style={styles.skipLinkText}>Continuar sin cuenta →</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.primary },
  container: { flexGrow: 1, padding: 24, justifyContent: 'center', backgroundColor: colors.primary },
  header: { alignItems: 'center', marginBottom: 40 },
  escudoImg: {
    width: 90,
    height: 90,
    marginBottom: 14,
  },
  title: { fontSize: 32, fontWeight: 'bold', color: colors.white },
  subtitle: { fontSize: 16, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
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
  label: { fontSize: 14, color: colors.text, marginBottom: 6, marginTop: 12, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: colors.white,
    color: colors.text,
  },
  passRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.white,
  },
  passInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
  eyeBtn: { paddingHorizontal: 12, paddingVertical: 10 },
  eyeText: { fontSize: 18 },
  error: { color: colors.error, marginTop: 12, textAlign: 'center' },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: colors.white, fontSize: 16, fontWeight: 'bold' },
  forgotLink: { marginTop: 14, alignItems: 'center' },
  forgotLinkText: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  registerLink: { marginTop: 16, alignItems: 'center' },
  registerLinkText: { fontSize: 14, color: colors.textSecondary },
  registerLinkBold: { color: colors.primary, fontWeight: 'bold' },
  skipLink: { marginTop: 12, alignItems: 'center' },
  skipLinkText: { fontSize: 13, color: colors.textSecondary },
});
