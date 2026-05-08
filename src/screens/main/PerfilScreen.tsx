import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  TextInput, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Image, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import PhoneInput from '../../components/PhoneInput';
import { Abono, Entrada } from '../../types';
import QRCode from 'react-native-qrcode-svg';
import * as ImagePicker from 'expo-image-picker';
import { ESCUDO_URL, TEMPORADA_CORTA } from '../../constants';

// ─── Loyalty helpers ──────────────────────────────────────────────────────────

interface NivelFidelidad {
  nombre: string;
  icono: string;
  color: string;
  minPartidos: number;
  maxPartidos: number | null;
}

const NIVELES: NivelFidelidad[] = [
  { nombre: 'Hincha',   icono: '🔴', color: '#C8102E', minPartidos: 0,  maxPartidos: 4  },
  { nombre: 'Fiel',     icono: '🟠', color: '#E07020', minPartidos: 5,  maxPartidos: 14 },
  { nombre: 'Veterano', icono: '⚪', color: '#888888', minPartidos: 15, maxPartidos: 29 },
  { nombre: 'Leyenda',  icono: '🏆', color: '#C8A000', minPartidos: 30, maxPartidos: null },
];

function getNivel(partidos: number): NivelFidelidad {
  return (
    [...NIVELES].reverse().find((n) => partidos >= n.minPartidos) ?? NIVELES[0]
  );
}

function getSiguienteNivel(partidos: number): NivelFidelidad | null {
  return NIVELES.find((n) => n.minPartidos > partidos) ?? null;
}

function getProgresoNivel(partidos: number): number {
  const nivel = getNivel(partidos);
  const siguiente = getSiguienteNivel(partidos);
  if (!siguiente) return 1; // Leyenda → barra llena
  const rango = siguiente.minPartidos - nivel.minPartidos;
  const avance = partidos - nivel.minPartidos;
  return Math.min(avance / rango, 1);
}

export default function PerfilScreen() {
  const { user, logout, updateUser } = useAuth();
  const navigation = useNavigation<any>();

  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [dni, setDni] = useState('');
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const toastAnim = useRef(new Animated.Value(0)).current;

  const [abonos, setAbonos] = useState<Abono[]>([]);
  const [loadingAbonos, setLoadingAbonos] = useState(false);
  const [loadingAll, setLoadingAll] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Fidelidad
  const [partidosAsistidos, setPartidosAsistidos] = useState(0);
  const [loadingFidelidad, setLoadingFidelidad] = useState(false);

  // Historial fan stats
  const [totalEntradas, setTotalEntradas] = useState(0);
  const [totalAbonos, setTotalAbonos] = useState(0);
  const [loadingStats, setLoadingStats] = useState(false);

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

  const initials = (() => {
    const n = user?.nombre || user?.email || '';
    return n.split(/\s+/).map((w: string) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?';
  })();

  // FIX-7: Consolidated single useEffect with Promise.allSettled — no duplicate fetches
  useEffect(() => {
    if (!user?.id) return;
    setLoadingAll(true);
    setLoadingAbonos(true);
    setLoadingStats(true);
    setLoadingFidelidad(true);
    Promise.allSettled([
      api.get<any>(`/api/abonos/usuario/${user.id}`),
      api.get<any>('/api/pagos/historial'),
    ]).then(([abonosRes, historialRes]) => {
      if (abonosRes.status === 'fulfilled') {
        const d = abonosRes.value.data;
        const lista: Abono[] = Array.isArray(d) ? d : (d?.abonos ?? []);
        setAbonos(lista);
        setTotalAbonos(lista.length);
      }
      if (historialRes.status === 'fulfilled') {
        const d = historialRes.value.data;
        const lista = Array.isArray(d) ? d : (d?.entradas ?? d?.pagos ?? []);
        setTotalEntradas(lista.length);
        const usadas = lista.filter((e: Entrada) => e.estado === 'usada').length;
        setPartidosAsistidos(usadas);
      }
    }).finally(() => {
      setLoadingAll(false);
      setLoadingAbonos(false);
      setLoadingStats(false);
      setLoadingFidelidad(false);
    });
  }, [user?.id]);

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
      setNombre(user.nombre || '');
      setTelefono(user.telefono || '');
      setDni(user.dni || '');
    }
  }, [user]);

  useEffect(() => { if (!user) { setAbonos([]); setPartidosAsistidos(0); } }, [user]);

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
      const { data } = await api.put('/api/user/profile', {
        nombre: nombre.trim(),
        telefono: telefono.trim(),
        dni: dni.trim(),
      });
      await updateUser(data.usuario ?? { nombre: nombre.trim(), telefono: telefono.trim(), dni: dni.trim() });
      setProfileSaved(true);
      Animated.sequence([
        Animated.timing(toastAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.delay(1900),
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
      {profileSaved && (
        <Animated.View style={[styles.toast, { opacity: toastAnim }]}>
          <Text style={styles.toastText}>✓ Perfil guardado</Text>
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

          {/* Mi historial como aficionado */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Mi historial como aficionado</Text>
            {loadingStats ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 12 }} />
            ) : totalEntradas === 0 && totalAbonos === 0 ? (
              <Text style={styles.label}>Aún no has comprado entradas</Text>
            ) : (
              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{totalEntradas}</Text>
                  <Text style={styles.statLabel}>Entradas compradas</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{totalAbonos}</Text>
                  <Text style={styles.statLabel}>Temporadas abonado</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{getNivel(partidosAsistidos).icono}</Text>
                  <Text style={styles.statLabel}>Nivel {getNivel(partidosAsistidos).nombre}</Text>
                </View>
              </View>
            )}
          </View>

          {/* Mi Fidelidad */}
          {(() => {
            const nivel = getNivel(partidosAsistidos);
            const siguiente = getSiguienteNivel(partidosAsistidos);
            const progreso = getProgresoNivel(partidosAsistidos);
            return (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Mi Fidelidad</Text>
                {loadingFidelidad ? (
                  <ActivityIndicator color={colors.primary} style={{ marginVertical: 12 }} />
                ) : (
                  <>
                    {/* Badge de nivel */}
                    <View style={[styles.fidelidadBadge, { backgroundColor: nivel.color + '18', borderColor: nivel.color }]}>
                      <Text style={styles.fidelidadIcono}>{nivel.icono}</Text>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={[styles.fidelidadNivelNombre, { color: nivel.color }]}>{nivel.nombre}</Text>
                        <Text style={styles.fidelidadPartidos}>
                          {partidosAsistidos} {partidosAsistidos === 1 ? 'partido asistido' : 'partidos asistidos'}
                        </Text>
                      </View>
                    </View>

                    {/* Barra de progreso */}
                    <View style={styles.fidelidadBarraFondo}>
                      <View
                        style={[
                          styles.fidelidadBarraRelleno,
                          { width: `${Math.round(progreso * 100)}%` as any, backgroundColor: nivel.color },
                        ]}
                      />
                    </View>

                    {/* Texto motivador */}
                    {siguiente ? (
                      <Text style={styles.fidelidadMotivador}>
                        ¡{siguiente.minPartidos - partidosAsistidos} {siguiente.minPartidos - partidosAsistidos === 1 ? 'partido más' : 'partidos más'} para ser {siguiente.nombre} {siguiente.icono}!
                      </Text>
                    ) : (
                      <Text style={styles.fidelidadMotivador}>
                        🏆 ¡Eres una leyenda del Algeciras CF! Nivel máximo alcanzado.
                      </Text>
                    )}
                  </>
                )}
              </View>
            );
          })()}

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
                  secureTextEntry={!showPassConfirm}
                  placeholder="Repite la contraseña"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassConfirm(p => !p)}>
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

          {/* Carnet Digital */}
          {abonos.filter(a => a.activo).length > 0 && (
            <View>
              <Text style={styles.carnetSectionTitle}>Carnet Digital</Text>
              {abonos.filter(a => a.activo).map(a => (
                <View key={`carnet-${a.id}`} style={styles.carnetCard}>
                  {/* Carnet Header */}
                  <View style={styles.carnetHeader}>
                    <Image
                      source={{ uri: ESCUDO_URL }}
                      style={styles.carnetEscudo}
                      resizeMode="contain"
                    />
                    <View style={styles.carnetHeaderText}>
                      <Text style={styles.carnetClub}>ALGECIRAS CF</Text>
                      <Text style={styles.carnetTemporada}>ABONO {TEMPORADA_CORTA}</Text>
                    </View>
                  </View>
                  {/* Carnet Body */}
                  <View style={styles.carnetBody}>
                    <View style={styles.carnetInfo}>
                      <Text style={styles.carnetLabel}>Titular</Text>
                      <Text style={styles.carnetValue}>{a.nombre} {a.apellidos}</Text>
                      {user.dni ? (
                        <>
                          <Text style={styles.carnetLabel}>DNI</Text>
                          <Text style={styles.carnetValue}>{user.dni}</Text>
                        </>
                      ) : null}
                      <Text style={styles.carnetLabel}>Abono</Text>
                      <Text style={styles.carnetValue}>{a.codigoAbonado ? a.codigoAbonado : `#${a.id}`}</Text>
                      <Text style={styles.carnetLabel}>Válido</Text>
                      <Text style={styles.carnetValue}>
                        {new Date(a.fechaInicio).toLocaleDateString('es-ES')} – {new Date(a.fechaFin).toLocaleDateString('es-ES')}
                      </Text>
                    </View>
                    {a.codigoAcceso ? (
                      <View style={styles.carnetQrWrap}>
                        <QRCode
                          value={a.codigoAcceso}
                          size={120}
                          color={colors.text}
                          backgroundColor={colors.white}
                        />
                        <Text style={styles.carnetQrLabel}>Acceso</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Mis Abonos */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Mis Abonos</Text>
            {loadingAbonos ? (
              <ActivityIndicator color={colors.primary} />
            ) : abonos.length === 0 ? (
              <Text style={styles.label}>No tienes abonos activos</Text>
            ) : (
              abonos.map(a => (
                <View key={a.id} style={styles.abonoRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.abonoNombre}>{a.nombre} {a.apellidos}</Text>
                    <Text style={styles.abonoDetalle}>Asiento #{a.asientoId} · {a.precio}€</Text>
                    <Text style={styles.abonoDetalle}>
                      {new Date(a.fechaInicio).toLocaleDateString()} – {new Date(a.fechaFin).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={[styles.abonoEstado, a.activo ? styles.abonoActivo : styles.abonoInactivo]}>
                    <Text style={styles.abonoEstadoText}>{a.activo ? 'Activo' : 'Inactivo'}</Text>
                  </View>
                </View>
              ))
            )}
          </View>

          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('MisAbonos')}>
            <Text style={styles.menuIcon}>🎟️</Text>
            <Text style={styles.menuLabel}>Mis Abonos</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('MisEntradas')}>
            <Text style={styles.menuIcon}>🏟️</Text>
            <Text style={styles.menuLabel}>Mis Entradas</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

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
  avatarSection: { alignItems: 'center', marginBottom: 16 },
  avatarWrap: { width: 96, height: 96, position: 'relative' },
  avatarImg: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.border },
  avatarFallback: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitials: { color: colors.white, fontSize: 32, fontWeight: 'bold' },
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
  abonoRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  abonoNombre: { fontSize: 14, fontWeight: 'bold', color: colors.text },
  abonoDetalle: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  abonoEstado: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  abonoActivo: { backgroundColor: '#e8f5ee' },
  abonoInactivo: { backgroundColor: '#fce8e8' },
  abonoEstadoText: { fontSize: 12, fontWeight: 'bold', color: colors.text },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: 16,
    marginHorizontal: 0,
    marginBottom: 8,
    borderRadius: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  menuIcon: { fontSize: 20, marginRight: 12 },
  menuLabel: { flex: 1, fontSize: 15, color: colors.text, fontWeight: '500' },
  menuArrow: { fontSize: 20, color: colors.textSecondary },
  // Carnet Digital
  carnetSectionTitle: {
    fontSize: 16, fontWeight: 'bold', color: colors.text,
    marginBottom: 10, marginTop: 4,
  },
  carnetCard: {
    backgroundColor: colors.white,
    borderRadius: 14, marginBottom: 14,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(200,16,46,0.15)',
  },
  carnetHeader: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  carnetEscudo: { width: 40, height: 40, marginRight: 12 },
  carnetHeaderText: { flex: 1 },
  carnetClub: { color: colors.white, fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },
  carnetTemporada: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2 },
  carnetBody: {
    flexDirection: 'row', alignItems: 'center',
    padding: 16,
  },
  carnetInfo: { flex: 1 },
  carnetLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  carnetValue: { fontSize: 14, color: colors.text, fontWeight: '600' },
  carnetQrWrap: { alignItems: 'center', marginLeft: 16 },
  carnetQrLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  // Fan stats
  statsRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  statCard: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: { fontSize: 22, fontWeight: 'bold', color: colors.primary },
  statLabel: { fontSize: 12, color: colors.textSecondary, textAlign: 'center', marginTop: 4 },
  // Fidelidad
  fidelidadBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
    marginBottom: 12,
  },
  fidelidadIcono: { fontSize: 32 },
  fidelidadNivelNombre: { fontSize: 18, fontWeight: 'bold' },
  fidelidadPartidos: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  fidelidadBarraFondo: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  fidelidadBarraRelleno: {
    height: 8,
    borderRadius: 4,
  },
  fidelidadMotivador: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
    fontStyle: 'italic',
  },
  toast: {
    position: 'absolute',
    bottom: 80,
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
  toastText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});
