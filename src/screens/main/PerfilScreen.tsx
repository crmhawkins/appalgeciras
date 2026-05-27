import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  TextInput, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Image, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import PhoneInput from '../../components/PhoneInput';

/**
 * Pantalla "Editar mis datos personales".
 *
 * Refactor 2026-05-27: dejó de ser el hub de la cuenta (eso es ahora
 * `MiCuentaHomeScreen`). Aquí solo se editan datos personales y se
 * cambia la contraseña. El acceso a Abonos / Entradas / Compras /
 * Beneficios / Notificaciones se hace desde `MiCuentaHome`.
 */
export default function PerfilScreen() {
  const { user, logout, updateUser } = useAuth();
  const navigation = useNavigation<any>();

  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [dni, setDni] = useState('');
  const [direccion, setDireccion] = useState('');
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const toastAnim = useRef(new Animated.Value(0)).current;
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [showPassForm, setShowPassForm] = useState(false);
  const [passActual, setPassActual] = useState('');
  const [passNueva, setPassNueva] = useState('');
  const [passConfirm, setPassConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showPassNueva, setShowPassNueva] = useState(false);
  const [showPassConfirm, setShowPassConfirm] = useState(false);
  const [loadingPass, setLoadingPass] = useState(false);

  useEffect(() => {
    if (user) {
      setNombre(user.nombre || user.name || '');
      setTelefono(user.telefono || '');
      setDni(user.dni || '');
      setDireccion((user as any).direccion || '');
    }
  }, [user]);

  const handlePickAvatar = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permiso requerido', 'Necesitamos acceso a tus fotos para cambiar el avatar.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (res.canceled || !res.assets || res.assets.length === 0) return;
      const asset = res.assets[0];
      setUploadingPhoto(true);
      const form = new FormData();
      const filename = asset.fileName || `avatar_${Date.now()}.jpg`;
      const type = asset.mimeType || 'image/jpeg';
      // @ts-ignore RN FormData file shape
      form.append('image', { uri: asset.uri, name: filename, type });
      const { data } = await api.put('/api/user/profile-image', form);
      const newUser = data?.usuario ?? { profileImage: data?.profileImage ?? data?.url };
      await updateUser(newUser);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.msg || 'No se pudo subir la foto');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!nombre.trim()) {
      Alert.alert('Error', 'El nombre es obligatorio');
      return;
    }
    setLoadingProfile(true);
    try {
      const payload: any = {
        nombre: nombre.trim(),
        telefono: telefono.trim(),
        dni: dni.trim(),
      };
      if (direccion.trim()) payload.direccion = direccion.trim();
      const { data } = await api.put('/api/user/profile', payload);
      await updateUser(data?.usuario ?? payload);
      setProfileSaved(true);
      Animated.sequence([
        Animated.timing(toastAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.delay(1700),
        Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(() => setProfileSaved(false));
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
          <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.back}>‹</Text></TouchableOpacity>
          <Text style={styles.headerTitle}>Mis Datos</Text>
          <View style={{ width: 32 }} />
        </View>
        <View style={styles.center}>
          <Text style={styles.dim}>Inicia sesión para editar tus datos.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const initials = (() => {
    const n = (user.nombre || user.name || user.email || '');
    return n.split(/\s+/).map((w: string) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?';
  })();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.back}>‹</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>Mis Datos</Text>
        <View style={{ width: 32 }} />
      </View>

      {profileSaved && (
        <Animated.View style={[styles.toast, { opacity: toastAnim }]}>
          <Text style={styles.toastText}>✓ Datos guardados</Text>
        </Animated.View>
      )}

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
          {/* Avatar */}
          <View style={styles.avatarSection}>
            <TouchableOpacity
              style={styles.avatarWrap}
              onPress={handlePickAvatar}
              activeOpacity={0.8}
              disabled={uploadingPhoto}
            >
              {user.profileImage ? (
                <Image source={{ uri: user.profileImage }} style={styles.avatarImg} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarInitials}>{initials}</Text>
                </View>
              )}
              <View style={styles.avatarCamBadge}>
                {uploadingPhoto ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <Text style={styles.avatarCamText}>📷</Text>
                )}
              </View>
            </TouchableOpacity>
          </View>

          {/* Cuenta (read-only email) */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Cuenta</Text>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{user.email}</Text>
          </View>

          {/* Datos editables */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Mis datos personales</Text>

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

            <Text style={styles.label}>Dirección</Text>
            <TextInput
              style={styles.input}
              value={direccion}
              onChangeText={setDireccion}
              placeholder="Calle, número, ciudad"
              autoCapitalize="words"
            />

            <TouchableOpacity
              style={[styles.saveBtn, loadingProfile && styles.saveBtnDisabled]}
              onPress={handleSaveProfile}
              disabled={loadingProfile}
            >
              {loadingProfile ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.saveBtnText}>Guardar datos</Text>
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
                <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPass((p) => !p)}>
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
                <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassNueva((p) => !p)}>
                  <Text style={styles.eyeText}>{showPassNueva ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Confirmar nueva contraseña</Text>
              <View style={styles.passRow}>
                <TextInput
                  style={styles.passInput}
                  value={passConfirm}
                  onChangeText={setPassConfirm}
                  secureTextEntry={!showPassConfirm}
                  placeholder="Repite la contraseña"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassConfirm((p) => !p)}>
                  <Text style={styles.eyeText}>{showPassConfirm ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
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

          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={() =>
              Alert.alert('Cerrar sesión', '¿Seguro que quieres salir?', [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Salir', style: 'destructive', onPress: () => logout() },
              ])
            }
          >
            <Text style={styles.logoutText}>Cerrar sesión</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 12,
  },
  back: { color: colors.white, fontSize: 28, fontWeight: '800', width: 32 },
  headerTitle: { color: colors.white, fontSize: 18, fontWeight: '800' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  dim: { color: colors.textSecondary, fontSize: 14, textAlign: 'center' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  avatarSection: { alignItems: 'center', marginBottom: 12 },
  avatarWrap: { width: 96, height: 96, position: 'relative' },
  avatarImg: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.border },
  avatarFallback: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitials: { color: colors.white, fontSize: 32, fontWeight: '800' },
  avatarCamBadge: {
    position: 'absolute', right: -2, bottom: -2,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.white,
  },
  avatarCamText: { fontSize: 16 },
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
  cardTitle: { fontSize: 15, fontWeight: '800', color: colors.primary, marginBottom: 10 },
  label: { fontSize: 13, color: colors.textSecondary, marginTop: 8 },
  value: { fontSize: 15, color: colors.text, marginTop: 3, fontWeight: '700' },
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
  passInput: { flex: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: colors.text },
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
  changePassBtnText: { color: colors.primary, fontWeight: '800' },
  saveBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 14,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: colors.white, fontWeight: '800' },
  logoutBtn: {
    backgroundColor: colors.error,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  logoutText: { color: colors.white, fontWeight: '800', fontSize: 16 },
  toast: {
    position: 'absolute',
    top: 70,
    left: 20,
    right: 20,
    backgroundColor: '#2e7d32',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    zIndex: 999,
    elevation: 10,
  },
  toastText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
