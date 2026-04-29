import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  TextInput, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import PhoneInput from '../../components/PhoneInput';

export default function PerfilScreen() {
  const { user, logout } = useAuth();
  const navigation = useNavigation<any>();

  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [dni, setDni] = useState('');
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  const [showPassForm, setShowPassForm] = useState(false);
  const [passActual, setPassActual] = useState('');
  const [passNueva, setPassNueva] = useState('');
  const [passConfirm, setPassConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showPassNueva, setShowPassNueva] = useState(false);
  const [loadingPass, setLoadingPass] = useState(false);

  useEffect(() => {
    if (user) {
      setNombre((user as any).nombre || '');
      setTelefono((user as any).telefono || '');
      setDni((user as any).dni || '');
    }
  }, [user]);

  const goLogin = () => navigation.navigate('Auth', { screen: 'Login' });
  const goRegister = () => navigation.navigate('Auth', { screen: 'Register' });

  const confirmLogout = () => {
    Alert.alert('Cerrar sesión', '¿Seguro que quieres salir?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: () => logout() },
    ]);
  };

  const handleSaveProfile = async () => {
    if (!nombre.trim()) {
      Alert.alert('Error', 'El nombre es obligatorio');
      return;
    }
    setLoadingProfile(true);
    try {
      await api.put('/api/user/profile', {
        nombre: nombre.trim(),
        telefono: telefono.trim(),
        dni: dni.trim(),
      });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2500);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.msg || 'Error al guardar el perfil');
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passActual || !passNueva || !passConfirm) {
      Alert.alert('Error', 'Rellena todos los campos');
      return;
    }
    if (passNueva !== passConfirm) {
      Alert.alert('Error', 'Las contraseñas nuevas no coinciden');
      return;
    }
    if (passNueva.length < 6) {
      Alert.alert('Error', 'La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }
    setLoadingPass(true);
    try {
      await api.put('/api/user/change-password', {
        passwordActual: passActual,
        passwordNueva: passNueva,
      });
      Alert.alert('Listo', 'Contraseña actualizada correctamente');
      setShowPassForm(false);
      setPassActual('');
      setPassNueva('');
      setPassConfirm('');
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.msg || 'Error al cambiar la contraseña');
    } finally {
      setLoadingPass(false);
    }
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Mi Perfil</Text>
        </View>
        <View style={styles.guestContainer}>
          <Text style={styles.guestTitle}>¿Ya tienes cuenta?</Text>
          <Text style={styles.guestText}>Inicia sesión para ver tu perfil y gestionar tus abonos</Text>
          <TouchableOpacity style={styles.loginBtn} onPress={goLogin}>
            <Text style={styles.loginBtnText}>Iniciar sesión</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.registerBtn} onPress={goRegister}>
            <Text style={styles.registerBtnText}>Crear cuenta</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mi Perfil</Text>
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Datos de cuenta (solo lectura) */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Cuenta</Text>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{user.email}</Text>
          </View>

          {/* Datos editables */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Mis datos</Text>

            <Text style={styles.label}>Nombre *</Text>
            <TextInput
              style={styles.input}
              value={nombre}
              onChangeText={setNombre}
              placeholder="Tu nombre"
              autoCapitalize="words"
            />

            <Text style={styles.label}>Teléfono</Text>
            <PhoneInput value={telefono} onChange={setTelefono} />

            <Text style={styles.label}>DNI</Text>
            <TextInput
              style={styles.input}
              value={dni}
              onChangeText={setDni}
              placeholder="12345678Z"
              autoCapitalize="characters"
            />

            <TouchableOpacity
              style={[styles.saveBtn, loadingProfile && styles.saveBtnDisabled]}
              onPress={handleSaveProfile}
              disabled={loadingProfile}
            >
              {loadingProfile ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.saveBtnText}>
                  {profileSaved ? '✓ Guardado' : 'Guardar datos'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Cambiar contraseña */}
          <TouchableOpacity
            style={styles.changePassBtn}
            onPress={() => setShowPassForm(!showPassForm)}
          >
            <Text style={styles.changePassBtnText}>
              {showPassForm ? 'Cancelar' : 'Cambiar contraseña'}
            </Text>
          </TouchableOpacity>

          {showPassForm && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Nueva contraseña</Text>

              <Text style={styles.label}>Contraseña actual</Text>
              <View style={styles.passRow}>
                <TextInput
                  style={styles.passInput}
                  value={passActual}
                  onChangeText={setPassActual}
                  secureTextEntry={!showPass}
                  placeholder="Tu contraseña actual"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPass(p => !p)}>
                  <Text style={styles.eyeText}>{showPass ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Nueva contraseña</Text>
              <View style={styles.passRow}>
                <TextInput
                  style={styles.passInput}
                  value={passNueva}
                  onChangeText={setPassNueva}
                  secureTextEntry={!showPassNueva}
                  placeholder="Mínimo 6 caracteres"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassNueva(p => !p)}>
                  <Text style={styles.eyeText}>{showPassNueva ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Confirmar nueva contraseña</Text>
              <View style={styles.passRow}>
                <TextInput
                  style={styles.passInput}
                  value={passConfirm}
                  onChangeText={setPassConfirm}
                  secureTextEntry={!showPassNueva}
                  placeholder="Repite la contraseña"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, loadingPass && styles.saveBtnDisabled]}
                onPress={handleChangePassword}
                disabled={loadingPass}
              >
                {loadingPass ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.saveBtnText}>Guardar contraseña</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity style={styles.logoutBtn} onPress={confirmLogout}>
            <Text style={styles.logoutText}>Cerrar sesión</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { padding: 16, backgroundColor: colors.primary },
  headerTitle: { color: colors.white, fontSize: 20, fontWeight: 'bold' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: colors.white,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  cardTitle: { fontSize: 15, fontWeight: 'bold', color: colors.primary, marginBottom: 10 },
  label: { fontSize: 13, color: colors.textSecondary, marginTop: 8 },
  value: { fontSize: 15, color: colors.text, marginTop: 3, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: colors.background,
    marginTop: 4,
    color: colors.text,
  },
  passRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.background,
    marginTop: 4,
  },
  passInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
  },
  eyeBtn: { paddingHorizontal: 12 },
  eyeText: { fontSize: 18 },
  changePassBtn: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  changePassBtnText: { color: colors.primary, fontWeight: 'bold' },
  saveBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 14,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: colors.white, fontWeight: 'bold' },
  logoutBtn: {
    backgroundColor: colors.error,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  logoutText: { color: colors.white, fontWeight: 'bold', fontSize: 16 },
  guestContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32,
  },
  guestTitle: { fontSize: 22, fontWeight: 'bold', color: colors.primary, marginBottom: 8 },
  guestText: { fontSize: 15, color: colors.textSecondary, textAlign: 'center', marginBottom: 28 },
  loginBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
  },
  loginBtnText: { color: colors.white, fontWeight: 'bold', fontSize: 16 },
  registerBtn: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.primary,
    paddingVertical: 13,
    paddingHorizontal: 40,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
  },
  registerBtnText: { color: colors.primary, fontWeight: 'bold', fontSize: 16 },
});
