import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  ScrollView, TextInput as RNTextInput, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import PhoneInput from '../../components/PhoneInput';
import { ESCUDO_URL } from '../../constants';

export default function RegisterScreen() {
  const { register } = useAuth();
  const navigation = useNavigation<any>();
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [dni, setDni] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailRef = useRef<RNTextInput>(null);
  const telefonoRef = useRef<RNTextInput>(null);
  const dniRef = useRef<RNTextInput>(null);
  const passRef = useRef<RNTextInput>(null);
  const confirmRef = useRef<RNTextInput>(null);

  const handleRegister = async () => {
    if (!nombre || !email || !password || !confirmPassword) {
      setError('Rellena todos los campos obligatorios');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await register(nombre.trim(), email.trim().toLowerCase(), password, dni.trim() || undefined, telefono.trim() || undefined);
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    } catch (e: any) {
      const msg =
        e?.response?.data?.errors?.[0]?.msg ||
        e?.response?.data?.msg ||
        e?.message ||
        'Error al registrarse';
      setError(msg);
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Image
              source={{ uri: ESCUDO_URL }}
              style={{ width: 70, height: 70, marginBottom: 10 }}
              resizeMode="contain"
              accessibilityLabel="Escudo Algeciras CF"
            />
            <Text style={styles.title}>Algeciras CF</Text>
            <Text style={styles.subtitle}>Crear cuenta</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Nombre *</Text>
            <TextInput
              style={styles.input}
              value={nombre}
              onChangeText={setNombre}
              placeholder="Tu nombre"
              autoCapitalize="words"
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
              blurOnSubmit={false}
            />

            <Text style={styles.label}>Email *</Text>
            <TextInput
              ref={emailRef}
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="tu@email.com"
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={() => telefonoRef.current?.focus()}
              blurOnSubmit={false}
            />

            <Text style={styles.label}>Teléfono</Text>
            <PhoneInput value={telefono} onChange={setTelefono} />

            <Text style={styles.label}>DNI</Text>
            <TextInput
              ref={dniRef}
              style={styles.input}
              value={dni}
              onChangeText={setDni}
              placeholder="12345678Z"
              autoCapitalize="characters"
              returnKeyType="next"
              onSubmitEditing={() => passRef.current?.focus()}
              blurOnSubmit={false}
            />

            <Text style={styles.label}>Contraseña *</Text>
            <View style={styles.passRow}>
              <TextInput
                ref={passRef}
                style={styles.passInput}
                value={password}
                onChangeText={setPassword}
                placeholder="Mínimo 6 caracteres"
                secureTextEntry={!showPass}
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="next"
                onSubmitEditing={() => confirmRef.current?.focus()}
                blurOnSubmit={false}
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPass(p => !p)}>
                <Text style={styles.eyeText}>{showPass ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Confirmar contraseña *</Text>
            <View style={styles.passRow}>
              <TextInput
                ref={confirmRef}
                style={styles.passInput}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Repite la contraseña"
                secureTextEntry={!showConfirmPass}
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="done"
                onSubmitEditing={handleRegister}
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowConfirmPass(p => !p)}>
                <Text style={styles.eyeText}>{showConfirmPass ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>

            {error && <Text style={styles.error}>{error}</Text>}

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.buttonText}>Crear cuenta</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.loginLink}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.loginLinkText}>
                ¿Ya tienes cuenta? <Text style={styles.loginLinkBold}>Inicia sesión</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.primary },
  container: { flexGrow: 1, padding: 24, paddingBottom: 40, backgroundColor: colors.primary },
  header: { alignItems: 'center', marginBottom: 24, marginTop: 8 },
  title: { fontSize: 30, fontWeight: 'bold', color: colors.white },
  subtitle: { fontSize: 16, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  form: { width: '100%', backgroundColor: colors.white, borderRadius: 16, padding: 20, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8 },
  label: { fontSize: 14, color: colors.text, marginBottom: 6, marginTop: 12, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
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
  loginLink: { marginTop: 16, alignItems: 'center', marginBottom: 8 },
  loginLinkText: { fontSize: 14, color: colors.textSecondary },
  loginLinkBold: { color: colors.primary, fontWeight: 'bold' },
});
