import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import GradasScreen from '../screens/abonos/GradasScreen';
import SectoresScreen from '../screens/abonos/SectoresScreen';
import AsientosScreen from '../screens/abonos/AsientosScreen';
import CheckoutScreen from '../screens/abonos/CheckoutScreen';
import { AbonosStackParamList } from '../types';
import { colors } from '../theme/colors';

const Stack = createNativeStackNavigator<AbonosStackParamList>();

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
