import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  TextInput, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

export default function PerfilScreen() {
  const { user, logout } = useAuth();
  const navigation = useNavigation<any>();

  const [showPassForm, setShowPassForm] = useState(false);
  const [passActual, setPassActual] = useState('');
  const [passNueva, setPassNueva] = useState('');
  const [passConfirm, setPassConfirm] = useState('');
  const [loadingPass, setLoadingPass] = useState(false);

  const goLogin = () => navigation.navigate('Auth', { screen: 'Login' });
  const goRegister = () => navigation.navigate('Auth', { screen: 'Register' });

  const confirmLogout = () => {
    Alert.alert('Cerrar sesión', '¿Seguro que quieres salir?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: () => logout() },
    ]);
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
      await api.put('/api/usuarios/change-password', {
        passwordActual: passActual,
        passwordNueva: passNueva,
      });
      Alert.alert('Listo', 'Contraseña actualizada correctamente');
      setShowPassForm(false);
      setPassActual('');
      setPassNueva('');
      setPassConfirm('');
    } catch (e: any) {
      const msg = e?.response?.data?.msg || e?.message || 'Error al cambiar la contraseña';
      Alert.alert('Error', msg);
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
          <Text style={styles.guestIcon}>👤</Text>
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
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.card}>
            <Text style={styles.label}>Nombre</Text>
            <Text style={styles.value}>{user.nombre || '—'}</Text>
            <View style={styles.divider} />
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{user.email}</Text>
          </View>

          <TouchableOpacity
            style={styles.changePassBtn}
            onPress={() => setShowPassForm(!showPassForm)}
          >
            <Text style={styles.changePassBtnText}>
              {showPassForm ? 'Cancelar cambio de contraseña' : '🔑 Cambiar contraseña'}
            </Text>
          </TouchableOpacity>

          {showPassForm && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Nueva contraseña</Text>
              <Text style={styles.label}>Contraseña actual</Text>
              <TextInput
                style={styles.input}
                value={passActual}
                onChangeText={setPassActual}
                secureTextEntry
                placeholder="••••••••"
              />
              <Text style={styles.label}>Nueva contraseña</Text>
              <TextInput
                style={styles.input}
                value={passNueva}
                onChangeText={setPassNueva}
                secureTextEntry
                placeholder="••••••••"
              />
              <Text style={styles.label}>Confirmar nueva contraseña</Text>
              <TextInput
                style={styles.input}
                value={passConfirm}
                onChangeText={setPassConfirm}
                secureTextEntry
                placeholder="••••••••"
              />
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
  scrollContent: { padding: 16 },
  card: {
    backgroundColor: colors.white,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
  },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: colors.primary, marginBottom: 12 },
  label: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  value: { fontSize: 16, color: colors.text, marginTop: 4, fontWeight: '600' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 12 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 11,
    fontSize: 15,
    backgroundColor: colors.background,
    marginTop: 6,
    marginBottom: 4,
  },
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
    marginTop: 12,
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
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  guestIcon: { fontSize: 64, marginBottom: 16 },
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
