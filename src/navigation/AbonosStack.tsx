import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ComprarHomeScreen from '../screens/abonos/ComprarHomeScreen';
import EntradasScreen from '../screens/abonos/EntradasScreen';
import GradasScreen from '../screens/abonos/GradasScreen';
import SectoresScreen from '../screens/abonos/SectoresScreen';
import AsientosScreen from '../screens/abonos/AsientosScreen';
import CheckoutScreen from '../screens/abonos/CheckoutScreen';
import { AbonosStackParamList } from '../types';
import { colors } from '../theme/colors';

const Stack = createNativeStackNavigator<AbonosStackParamList>();

/**
 * Stack de la pestaña "Comprar" del bottom tab.
 *
 * Histórico: hasta 2026-06-02 esto se llamaba sólo AbonosStack y entraba
 * directo a Gradas. El usuario reportó que la tab debía mostrar primero un
 * selector "Abono vs Entrada". Mantengo el nombre del archivo
 * AbonosStack para no romper imports, pero la ruta inicial es ahora
 * ComprarHome (selector). El sub-flujo de abono sigue siendo
 * Gradas → Sectores → Asientos → Checkout y el de entrada es la
 * EntradasScreen (lista de partidos próximos con WebBrowser al checkout).
 */
export default function AbonosStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.white,
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Stack.Screen
        name="ComprarHome"
        component={ComprarHomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Entradas"
        component={EntradasScreen}
        options={{ title: 'Entradas' }}
      />
      <Stack.Screen
        name="Gradas"
        component={GradasScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Sectores"
        component={SectoresScreen}
        options={{ title: 'Sectores' }}
      />
      <Stack.Screen
        name="Asientos"
        component={AsientosScreen}
        options={{ title: 'Selecciona Asiento' }}
      />
      <Stack.Screen
        name="Checkout"
        component={CheckoutScreen}
        options={{ title: 'Confirmar Compra' }}
      />
    </Stack.Navigator>
  );
}
