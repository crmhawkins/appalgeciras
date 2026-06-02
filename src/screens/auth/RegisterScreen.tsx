import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform,
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
  // duplicateField:
  //   'email'   → CTA "Iniciar sesión" + prellena email + opcional "He olvidado mi contraseña"
  //   'dni'     → CTA "Iniciar sesión" (puede que el DNI esté asignado a otra cuenta)
  //   null      → error genérico (sin CTA, solo texto rojo)
  const [duplicateField, setDuplicateField] = useState<'email' | 'dni' | null>(null);

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
    setDuplicateField(null);
    setLoading(true);
    try {
      await register(nombre.trim(), email.trim().toLowerCase(), password, dni.trim() || undefined, telefono.trim() || undefined);
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    } catch (e: any) {
      // El backend Laravel devuelve 422 con shape:
      //   { message: "El primer error", errors: { email: ["..."], dni: ["..."] } }
      // Si el campo duplicado es `email` o `dni`, mostramos CTA accionable
      // ("Iniciar sesión" pre-rellenando el email) en lugar de solo texto.
      const data = e?.response?.data;
      const errs = data?.errors || {};
      if (errs.email && Array.isArray(errs.email)) {
        setDuplicateField('email');
        setError(errs.email[0]);
      } else if (errs.dni && Array.isArray(errs.dni)) {
        setDuplicateField('dni');
        setError(errs.dni[0]);
      } else if (typeof errs === 'object' && Object.keys(errs).length > 0) {
        const allErrs = Object.values(errs).flat() as string[];
        setError(allErrs.join('\n'));
      } else {
        setError(data?.message || data?.msg || e?.message || 'Error al registrarse');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoLogin = () => {
    // Navega a la pantalla de login con el email pre-rellenado.
    navigation.navigate('Login', { prefilledEmail: email.trim().toLowerCase() });
  };

  const handleRecuperarPassword = () => {
    navigation.navigate('RecuperarPassword', { prefilledEmail: email.trim().toLowerCase() });
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

            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorBoxIcon}>{duplicateField ? '👤' : '⚠️'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.errorBoxText}>{error}</Text>
                  {duplicateField === 'email' && (
                    <View style={styles.errorBoxCtas}>
                      <TouchableOpacity style={styles.errorBoxCtaPrimary} onPress={handleGoLogin}>
                        <Text style={styles.errorBoxCtaPrimaryText}>Iniciar sesión</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.errorBoxCtaSecondary} onPress={handleRecuperarPassword}>
                        <Text style={styles.errorBoxCtaSecondaryText}>He olvidado la contraseña</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  {duplicateField === 'dni' && (
                    <View style={styles.errorBoxCtas}>
                      <TouchableOpacity style={styles.errorBoxCtaPrimary} onPress={handleGoLogin}>
                        <Text style={styles.errorBoxCtaPrimaryText}>Iniciar sesión</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            )}

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
  errorBox: {
    marginTop: 16,
    padding: 14,
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#FFF4E5',
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    borderRadius: 6,
  },
  errorBoxIcon: { fontSize: 22 },
  errorBoxText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '600',
  },
  errorBoxCtas: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  errorBoxCtaPrimary: {
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 6,
  },
  errorBoxCtaPrimaryText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 13,
  },
  errorBoxCtaSecondary: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  errorBoxCtaSecondaryText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 13,
  },
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
