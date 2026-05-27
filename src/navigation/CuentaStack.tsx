import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MiCuentaHomeScreen from '../screens/cuenta/MiCuentaHomeScreen';
import CarnetScreen from '../screens/cuenta/CarnetScreen';
import MisComprasScreen from '../screens/cuenta/MisComprasScreen';
import MisComprasDetalleScreen from '../screens/cuenta/MisComprasDetalleScreen';
import BeneficiosScreen from '../screens/cuenta/BeneficiosScreen';
import ActividadScreen from '../screens/cuenta/ActividadScreen';
import NotificacionesScreen from '../screens/cuenta/NotificacionesScreen';
import PerfilScreen from '../screens/main/PerfilScreen';
import MisAbonosScreen from '../screens/main/MisAbonosScreen';
import MisEntradasScreen from '../screens/main/MisEntradasScreen';
import { CuentaStackParamList } from '../types';

const Stack = createNativeStackNavigator<CuentaStackParamList>();

/**
 * Stack del tab "Mi Cuenta" — root = MiCuentaHomeScreen.
 * Desde ahí se navega a las sub-pantallas (Carnet, Compras, Beneficios, etc.).
 *
 * Las pantallas viejas (MisAbonosScreen / MisEntradasScreen) se reutilizan
 * tal cual; solo se mueven aquí dentro como destinos de las shortcuts.
 */
export default function CuentaStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MiCuentaHome"     component={MiCuentaHomeScreen} />
      <Stack.Screen name="Carnet"           component={CarnetScreen} />
      <Stack.Screen name="MisAbonosCuenta"  component={MisAbonosScreen} />
      <Stack.Screen name="MisEntradasCuenta" component={MisEntradasScreen} />
      <Stack.Screen name="MisCompras"       component={MisComprasScreen} />
      <Stack.Screen name="MisComprasDetalle" component={MisComprasDetalleScreen} />
      <Stack.Screen name="Beneficios"       component={BeneficiosScreen} />
      <Stack.Screen name="Actividad"        component={ActividadScreen} />
      <Stack.Screen name="Notificaciones"   component={NotificacionesScreen} />
      <Stack.Screen name="Perfil"           component={PerfilScreen} />
    </Stack.Navigator>
  );
}
