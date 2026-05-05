import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MainTabs from './MainTabs';
import PartidosScreen from '../screens/main/PartidosScreen';
import JugadorDetalleScreen from '../screens/main/JugadorDetalleScreen';
import { colors } from '../theme/colors';

export type MainStackParamList = {
  Tabs: undefined;
  Partidos: undefined;
  JugadorDetalle: { id: number };
};

const Stack = createNativeStackNavigator<MainStackParamList>();

export default function MainStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Tabs" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen
        name="Partidos"
        component={PartidosScreen}
        options={{
          title: 'Partidos',
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: colors.white,
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />
      <Stack.Screen
        name="JugadorDetalle"
        component={JugadorDetalleScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
